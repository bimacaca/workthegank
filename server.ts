import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { spawn } from 'child_process';
import os from 'os';
import { createWorker } from 'tesseract.js';
import ffmpegPath from 'ffmpeg-static';
import { createServer as createViteServer } from 'vite';
import { getDb, saveDb } from './server/db.js';

const app = express();
const PORT = 3005;
const OCR_MAX_FRAMES_PER_VIDEO = 60;
const numberCheckJobs = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  result?: {
    checkedVideos: number;
    framesScanned: number;
    matched: string[];
    missing: string[];
    note: string;
  };
  error?: string;
  updatedAt: number;
}>();

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `proof-${uniqueSuffix}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

const normalizePhone = (value: string) => {
  const cleaned = value.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  const digits = cleaned.replace(/\D/g, '');
  if (!cleaned.startsWith('+') && digits.startsWith('08')) return `62${digits.slice(1)}`;
  return digits;
};

async function getVideoDurationSeconds(videoPath: string): Promise<number> {
  if (!ffmpegPath) throw new Error('Pemroses video lokal belum tersedia');
  return new Promise((resolve, reject) => {
    const probe = spawn(ffmpegPath as string, ['-hide_banner', '-i', videoPath]);
    let stderr = '';
    probe.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    probe.on('error', reject);
    probe.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      if (!match) {
        reject(new Error('Durasi video tidak dapat dibaca'));
        return;
      }
      const duration = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Durasi video tidak valid'));
        return;
      }
      resolve(duration);
    });
  });
}

async function extractTextFromVideo(videoPath: string): Promise<{ text: string; framesScanned: number }> {
  if (!ffmpegPath) throw new Error('Pemroses video lokal belum tersedia');
  const duration = await getVideoDurationSeconds(videoPath);
  const samplingRate = (OCR_MAX_FRAMES_PER_VIDEO / duration).toFixed(10);
  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wtg-ocr-'));
  try {
    await new Promise<void>((resolve, reject) => {
      const process: any = spawn(ffmpegPath as string, [
        '-i', videoPath, '-vf', `fps=${samplingRate},scale=1600:-2:flags=lanczos,format=gray,eq=contrast=1.15:brightness=0.02`, '-frames:v', String(OCR_MAX_FRAMES_PER_VIDEO),
        path.join(frameDir, 'frame-%03d.jpg'),
      ]);
      process.on('error', reject);
      process.on('close', (code: number) => code === 0 ? resolve() : reject(new Error('Gagal membaca video')));
    });
    const frames = fs.readdirSync(frameDir).filter((file) => file.endsWith('.jpg'));
    const worker = await createWorker('eng', 1, {
      langPath: path.resolve(process.cwd(), 'node_modules/@tesseract.js-data/eng/4.0.0'),
      gzip: true,
    });
    try {
      const text: string[] = [];
      for (const frame of frames) {
        const result = await worker.recognize(path.join(frameDir, frame), {}, { text: true });
        text.push(result.data.text);
      }
      return { text: text.join('\n'), framesScanned: frames.length };
    } finally {
      await worker.terminate();
    }
  } finally {
    fs.rmSync(frameDir, { recursive: true, force: true });
  }
}

function phoneAppearsInOcr(recognizedText: string, phoneNumber: string): boolean {
  const digits = normalizePhone(phoneNumber);
  if (digits.length < 7) return false;

  // A WhatsApp list may put a timestamp beside the phone on the same OCR line.
  // Remove clock strings, then match the complete digit sequence. Do not
  // globally convert letters such as O/S/B to digits; that creates false hits
  // in unrelated interface text.
  const lines = recognizedText
    .replace(/\b\d{1,2}:\d{2}\b/g, ' ')
    .split(/\r?\n/);
  const numberPattern = [...digits].join('[\\s().-]*');
  const exactNumber = new RegExp(`(?:^|[^\\d\\s().-])${numberPattern}(?![\\s().-]*\\d)`);

  return lines.some((line) => exactNumber.test(line));
}

// Helper: Run query and return array of objects
async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper: Run single query
async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: Execute statement with side effects
async function execute(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  db.run(sql, params);
  saveDb();
}

// ==========================================
// API ROUTES: AUTHENTICATION & ADMIN MANAGEMENT
// ==========================================

// Unified Auth Login (Worker & Admin)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username wajib diisi' });
    }

    const trimmedUser = username.trim();
    const trimmedPass = (password || '').trim();

    // Password is required for all roles
    if (!trimmedPass) {
      return res.status(400).json({ error: 'Password wajib diisi untuk pengerja dan admin' });
    }

    // 1. Check if user is an Admin
    const admin = await queryOne(
      'SELECT id, username, role, created_at, password FROM admins WHERE LOWER(username) = LOWER(?)',
      [trimmedUser]
    );

    if (admin) {
      if (admin.password !== trimmedPass) {
        return res.status(401).json({
          error: `Password untuk admin "${admin.username}" salah!`,
          isAdminAccount: true,
        });
      }

      return res.json({
        success: true,
        role: 'admin',
        user: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          createdAt: admin.created_at,
        },
      });
    }

    // 2. Check if user is a Worker in database
    const worker = await queryOne(
      'SELECT id, username, role, created_at, password FROM workers WHERE LOWER(username) = LOWER(?)',
      [trimmedUser]
    );

    if (worker) {
      if (worker.password !== trimmedPass) {
        return res.status(401).json({
          error: `Password untuk pengerja "${worker.username}" salah!`,
          isWorkerAccount: true,
        });
      }

      return res.json({
        success: true,
        role: 'worker',
        user: {
          id: worker.id,
          username: worker.username,
          role: worker.role,
          createdAt: worker.created_at,
        },
      });
    }

    // Fallback check for default worker GasTerus / Gas12
    if (trimmedUser.toLowerCase() === 'gasterus') {
      if (trimmedPass !== 'Gas12') {
        return res.status(401).json({
          error: 'Password untuk pengerja GasTerus salah!',
          isWorkerAccount: true,
        });
      }
      return res.json({
        success: true,
        role: 'worker',
        user: {
          id: 'worker-primary',
          username: 'GasTerus',
          role: 'worker',
          createdAt: '2026-10-24 00:00',
        },
      });
    }

    return res.status(401).json({
      error: 'Username tidak terdaftar! Gunakan pengerja "GasTerus" atau admin "worktheadmin".',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Legacy /api/admin/login endpoint maintained for compatibility
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username wajib diisi' });
    }

    const trimmedUser = username.trim();
    const trimmedPass = (password || '').trim();

    // Check if admin
    const existingAdminUser = await queryOne(
      'SELECT id, username, role, created_at, password FROM admins WHERE LOWER(username) = LOWER(?)',
      [trimmedUser]
    );

    if (existingAdminUser) {
      if (existingAdminUser.password !== trimmedPass) {
        return res.status(401).json({
          isAdminAccount: true,
          error: `Password untuk admin "${existingAdminUser.username}" salah!`,
        });
      }
      return res.json({
        success: true,
        isAdminAccount: true,
        role: 'admin',
        admin: {
          id: existingAdminUser.id,
          username: existingAdminUser.username,
          role: existingAdminUser.role,
          createdAt: existingAdminUser.created_at,
        },
      });
    }

    // Check if worker
    const worker = await queryOne(
      'SELECT id, username, role, created_at, password FROM workers WHERE LOWER(username) = LOWER(?)',
      [trimmedUser]
    );

    if (worker || trimmedUser.toLowerCase() === 'gasterus') {
      const expectedPass = worker ? worker.password : 'Gas12';
      const actualUsername = worker ? worker.username : 'GasTerus';

      if (!trimmedPass) {
        return res.status(400).json({
          isAdminAccount: false,
          isWorkerAccount: true,
          error: 'Password pengerja wajib diisi',
        });
      }

      if (trimmedPass !== expectedPass) {
        return res.status(401).json({
          isAdminAccount: false,
          isWorkerAccount: true,
          error: `Password untuk pengerja "${actualUsername}" salah!`,
        });
      }

      return res.json({
        success: true,
        isAdminAccount: false,
        role: 'worker',
        worker: {
          id: worker ? worker.id : 'worker-primary',
          username: actualUsername,
          role: 'worker',
        },
      });
    }

    return res.status(404).json({
      isAdminAccount: false,
      error: 'Username tidak ditemukan',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all admin accounts (for logged-in admin)
app.get('/api/admin/list', async (_req, res) => {
  try {
    const rows = await queryAll('SELECT id, username, role, created_at FROM admins ORDER BY created_at ASC');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new admin account
app.post('/api/admin/create', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (cleanUser.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter' });
    }
    if (cleanPass.length < 5) {
      return res.status(400).json({ error: 'Password minimal 5 karakter' });
    }

    const existing = await queryOne('SELECT id FROM admins WHERE LOWER(username) = LOWER(?)', [cleanUser]);
    if (existing) {
      return res.status(400).json({ error: 'Username admin sudah digunakan' });
    }

    const id = `adm-${Date.now()}`;
    const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const adminRole = role?.trim() || 'admin';

    await execute(
      'INSERT INTO admins (id, username, password, created_at, role) VALUES (?, ?, ?, ?, ?)',
      [id, cleanUser, cleanPass, createdAt, adminRole]
    );

    const created = await queryOne('SELECT id, username, role, created_at FROM admins WHERE id = ?', [id]);
    res.json({ success: true, admin: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Change Admin Password
app.post('/api/admin/change-password', async (req, res) => {
  try {
    const { adminId, newPassword } = req.body;
    if (!adminId || !newPassword || newPassword.trim().length < 5) {
      return res.status(400).json({ error: 'Password baru minimal 5 karakter' });
    }

    await execute('UPDATE admins SET password = ? WHERE id = ?', [newPassword.trim(), adminId]);
    res.json({ success: true, message: 'Password admin berhasil diubah' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete admin account
app.delete('/api/admin/:id', async (req, res) => {
  try {
    const adminId = req.params.id;
    if (adminId === 'adm-primary') {
      return res.status(400).json({ error: 'Akun Super Admin utama tidak dapat dihapus' });
    }
    await execute('DELETE FROM admins WHERE id = ?', [adminId]);
    res.json({ success: true, message: 'Akun admin berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});



// 1. Get all operators
app.get('/api/operators', async (_req, res) => {
  try {
    const rows = await queryAll(`
      SELECT
        o.id,
        o.name,
        o.created_at,
        o.is_active,
        o.pin,
        COUNT(DISTINCT CASE
          WHEN t.status = 'approved' THEN t.id
        END) AS total_completed_tasks,
        COALESCE(SUM(CASE
          WHEN t.status = 'approved' AND n.status = 'done' THEN 1
          ELSE 0
        END), 0) AS total_completed_numbers,
        COALESCE(SUM(CASE
          WHEN t.status = 'approved' AND n.status = 'failed' THEN 1
          ELSE 0
        END), 0) AS total_failed_numbers
      FROM operators o
      LEFT JOIN tasks t ON LOWER(t.operator_name) = LOWER(o.name)
      LEFT JOIN task_numbers n ON n.task_id = t.id
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `);
    res.json(
      rows.map((operator) => ({
        id: operator.id,
        name: operator.name,
        createdAt: operator.created_at,
        totalCompletedTasks: operator.total_completed_tasks || 0,
        totalCompletedNumbers: operator.total_completed_numbers || 0,
        totalFailedNumbers: operator.total_failed_numbers || 0,
        isActive: Boolean(operator.is_active),
        hasPin: Boolean(operator.pin),
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Create operator
app.post('/api/operators', async (req, res) => {
  try {
    const { name, pin } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Nama pengerja wajib diisi' });
    }
    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN harus terdiri dari 6 angka' });
    }
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 32) {
      return res.status(400).json({ error: 'Nama harus antara 2 hingga 32 karakter' });
    }

    const existing = await queryOne('SELECT * FROM operators WHERE LOWER(name) = LOWER(?)', [cleanName]);
    if (existing) {
      return res.status(400).json({ error: 'Nama operator sudah terdaftar' });
    }

    const id = `op-${Date.now()}`;
    const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

    await execute(
      `INSERT INTO operators (id, name, pin, created_at, total_completed_tasks, total_completed_numbers, total_failed_numbers, is_active)
       VALUES (?, ?, ?, ?, 0, 0, 0, 1)`,
      [id, cleanName, pin, createdAt]
    );

    const created = await queryOne('SELECT * FROM operators WHERE id = ?', [id]);
    res.json({
      id: created.id,
      name: created.name,
      created_at: created.created_at,
      total_completed_tasks: created.total_completed_tasks || 0,
      total_completed_numbers: created.total_completed_numbers || 0,
      total_failed_numbers: created.total_failed_numbers || 0,
      is_active: created.is_active,
      hasPin: Boolean(created.pin),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify an operator PIN without exposing it to the client.
app.post('/api/operators/verify-pin', async (req, res) => {
  try {
    const { operatorId, pin } = req.body;
    if (!operatorId || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'Masukkan PIN yang terdiri dari 6 angka' });
    }

    const operator = await queryOne(
      'SELECT id, pin, is_active FROM operators WHERE id = ?',
      [operatorId]
    );
    if (!operator || !operator.is_active) {
      return res.status(404).json({ error: 'Nama pengerja tidak ditemukan atau tidak aktif' });
    }
    if (!operator.pin || operator.pin !== pin) {
      return res.status(401).json({ error: 'PIN tidak sesuai. Hubungi admin jika PIN belum disetel.' });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Reset Operator PIN (Admin)
app.post('/api/operators/reset-pin', async (req, res) => {
  try {
    const { operatorId, newPin } = req.body;
    if (!operatorId || typeof newPin !== 'string' || !/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ error: 'ID pengerja dan PIN 6 angka wajib diisi' });
    }
    const operator = await queryOne('SELECT id FROM operators WHERE id = ?', [operatorId]);
    if (!operator) {
      return res.status(404).json({ error: 'Pengerja tidak ditemukan' });
    }
    await execute('UPDATE operators SET pin = ? WHERE id = ?', [newPin, operatorId]);
    res.json({ success: true, message: 'PIN berhasil diubah' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to fetch full task with numbers, proofs, and reviews
async function getFullTask(taskId: string): Promise<any | null> {
  const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!task) return null;

  const numbers = await queryAll(
    'SELECT * FROM task_numbers WHERE task_id = ? ORDER BY no ASC',
    [taskId]
  );
  const proofVideos = await queryAll(
    'SELECT * FROM proof_videos WHERE task_id = ? ORDER BY uploaded_at ASC',
    [taskId]
  );
  const review = await queryOne('SELECT * FROM task_reviews WHERE task_id = ?', [taskId]);

  return {
    ...task,
    promoImageUrl: task.promo_image_url,
    numbers: numbers.map((n) => ({
      id: n.id,
      no: n.no,
      phoneNumber: n.phone_number,
      status: n.status,
      failedReason: n.failed_reason,
      updatedAt: n.updated_at,
    })),
    proofVideos: proofVideos.map((v) => ({
      id: v.id,
      fileName: v.file_name,
      fileSize: v.file_size,
      fileUrl: v.file_url,
      duration: v.duration,
      uploadedAt: v.uploaded_at,
    })),
    review: review
      ? {
          reviewedBy: review.reviewed_by,
          reviewedAt: review.reviewed_at,
          status: review.status,
          initialCount: review.initial_count,
          verifiedCount: review.verified_count,
          notes: review.notes,
        }
      : undefined,
  };
}

// 4. Get all tasks
app.get('/api/tasks', async (_req, res) => {
  try {
    const tasksRows = await queryAll('SELECT id FROM tasks ORDER BY created_at DESC');
    const tasks = await Promise.all(tasksRows.map((r) => getFullTask(r.id)));
    res.json(tasks.filter(Boolean));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Get single task
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await getFullTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task tidak ditemukan' });
    }
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Admin Create Task (supports multi-line phone numbers and custom code/content)
app.post('/api/tasks', async (req, res) => {
  try {
    const { code, store, batch, content, promoImageUrl, numbers } = req.body;
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return res.status(400).json({ error: 'Daftar nomor harus diisi' });
    }

    const id = (Math.floor(1000 + Math.random() * 9000)).toString();
    const taskCode = code?.trim() || `batch_${batch || '01'}_task #${id.slice(-3)}`;
    const taskStore = store?.trim() || 'gacor8800';
    const taskBatch = batch?.trim() || 'batch_01';
    const taskContent = content?.trim() || '';
    const createdAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

    await execute(
      `INSERT INTO tasks (id, code, store, batch, content, promo_image_url, status, created_at, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, 'available', ?, 'unpaid')`,
      [id, taskCode, taskStore, taskBatch, taskContent, promoImageUrl?.trim() || null, createdAt]
    );

    // Insert numbers
    for (let i = 0; i < numbers.length; i++) {
      const phone = normalizePhone(String(numbers[i]));

      const numId = `num-${id}-${i + 1}`;
      await execute(
        `INSERT INTO task_numbers (id, task_id, no, phone_number, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [numId, id, i + 1, phone]
      );
    }

    const createdTask = await getFullTask(id);
    res.json(createdTask);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload an optional promotional image for a task.
app.post('/api/tasks/:id/promo-image', upload.single('image'), async (req, res) => {
  try {
    const task = await queryOne('SELECT id FROM tasks WHERE id = ?', [req.params.id]);
    if (!task) return res.status(404).json({ error: 'Task tidak ditemukan' });
    if (!req.file || !req.file.mimetype.startsWith('image/')) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Pilih file gambar JPG, PNG, WEBP, atau GIF' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    await execute('UPDATE tasks SET promo_image_url = ? WHERE id = ?', [imageUrl, req.params.id]);
    res.json({ promoImageUrl: imageUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Admin Update Task (Edit content & numbers)
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { code, store, batch, content, promoImageUrl, numbers } = req.body;

    const task = await queryOne('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task tidak ditemukan' });
    }

    if (code !== undefined || store !== undefined || batch !== undefined || content !== undefined || promoImageUrl !== undefined) {
      await execute(
        `UPDATE tasks
         SET code = COALESCE(?, code),
             store = COALESCE(?, store),
             batch = COALESCE(?, batch),
             content = COALESCE(?, content),
             promo_image_url = COALESCE(?, promo_image_url)
         WHERE id = ?`,
        [code, store, batch, content, promoImageUrl, taskId]
      );
    }

    // If numbers provided, replace or update
    if (numbers && Array.isArray(numbers)) {
      await execute('DELETE FROM task_numbers WHERE task_id = ?', [taskId]);
      for (let i = 0; i < numbers.length; i++) {
        const item = numbers[i];
        const phone = normalizePhone(String(typeof item === 'string' ? item : item.phoneNumber));

        const numId = `num-${taskId}-${i + 1}`;
        const status = (typeof item === 'object' && item.status) || 'pending';
        const reason = typeof item === 'object' ? item.failedReason || null : null;

        await execute(
          `INSERT INTO task_numbers (id, task_id, no, phone_number, status, failed_reason)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [numId, taskId, i + 1, phone, status, reason]
        );
      }
    }

    const updated = await getFullTask(taskId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Admin Delete Task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    await execute('DELETE FROM tasks WHERE id = ?', [taskId]);
    await execute('DELETE FROM task_numbers WHERE task_id = ?', [taskId]);
    await execute('DELETE FROM proof_videos WHERE task_id = ?', [taskId]);
    await execute('DELETE FROM task_reviews WHERE task_id = ?', [taskId]);
    res.json({ success: true, message: 'Task berhasil dihapus' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Delete Tasks in bulk
app.post('/api/tasks/bulk-delete', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ error: 'Pilih minimal satu task' });
    const placeholders = ids.map(() => '?').join(',');
    await execute(`DELETE FROM task_numbers WHERE task_id IN (${placeholders})`, ids);
    await execute(`DELETE FROM proof_videos WHERE task_id IN (${placeholders})`, ids);
    await execute(`DELETE FROM task_reviews WHERE task_id IN (${placeholders})`, ids);
    await execute(`DELETE FROM tasks WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, deleted: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Worker Claim Top Task
app.post('/api/tasks/claim-next', async (req, res) => {
  try {
    const { operatorName } = req.body;
    if (!operatorName) {
      return res.status(400).json({ error: 'Nama operator diperlukan' });
    }

    // Check if worker already has an active in_progress task
    const existing = await queryOne(
      "SELECT id FROM tasks WHERE status = 'in_progress' AND operator_name = ?",
      [operatorName]
    );
    if (existing) {
      const full = await getFullTask(existing.id);
      return res.json(full);
    }

    // Find first available task
    const nextAvailable = await queryOne(
      "SELECT id FROM tasks WHERE status = 'available' ORDER BY created_at ASC LIMIT 1"
    );
    if (!nextAvailable) {
      return res.status(404).json({ error: 'Tidak ada task tersedia di antrean' });
    }

    const startedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await execute(
      `UPDATE tasks
       SET status = 'in_progress',
           operator_name = ?,
           operator_pin = '',
           started_at = ?
       WHERE id = ?`,
         [operatorName, startedAt, nextAvailable.id]
    );

    const claimed = await getFullTask(nextAvailable.id);
    res.json(claimed);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Update Number Status (Done / Failed)
app.post('/api/tasks/:id/numbers/:numberId', async (req, res) => {
  try {
    const { id: taskId, numberId } = req.params;
    const { status, failedReason } = req.body;
    const updatedAt = new Date().toISOString();

    await execute(
      `UPDATE task_numbers
       SET status = ?,
           failed_reason = ?,
           updated_at = ?
       WHERE task_id = ? AND id = ?`,
      [status, status === 'failed' ? failedReason || 'Nomor tidak terdaftar' : null, updatedAt, taskId, numberId]
    );

    const updated = await getFullTask(taskId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin helper only: run OCR outside the HTTP request so long videos don't
// keep the request open until a hosting proxy returns a 504 timeout.
app.post('/api/tasks/:id/check-numbers', async (req, res) => {
  try {
    const task = await getFullTask(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task tidak ditemukan' });
    const proofFiles = (task.proofVideos || [])
      .map((video: any) => path.resolve(UPLOADS_DIR, path.basename(video.fileUrl || '')))
      .filter((file: string) => fs.existsSync(file));
    if (!proofFiles.length) return res.status(400).json({ error: 'Tidak ada video bukti lokal yang dapat diperiksa' });

    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    numberCheckJobs.set(jobId, { status: 'processing', updatedAt: Date.now() });
    for (const [oldJobId, job] of numberCheckJobs) {
      if (Date.now() - job.updatedAt > 30 * 60 * 1000) numberCheckJobs.delete(oldJobId);
    }
    res.status(202).json({ jobId, status: 'processing' });

    setImmediate(async () => {
      try {
        const videoScans = await Promise.all(proofFiles.map(extractTextFromVideo));
        const framesScanned = videoScans.reduce((total, scan) => total + scan.framesScanned, 0);
        const taskNumbers = task.numbers.map((number: any) => ({
          phoneNumber: normalizePhone(number.phoneNumber),
        }));
        const matched = taskNumbers.filter((number: any) =>
          videoScans.some((scan) => phoneAppearsInOcr(scan.text, number.phoneNumber))
        );
        const missing = taskNumbers.filter((number: any) =>
          !videoScans.some((scan) => phoneAppearsInOcr(scan.text, number.phoneNumber))
        );
        const job = numberCheckJobs.get(jobId);
        if (job) {
          job.status = 'completed';
          job.result = {
            checkedVideos: proofFiles.length,
            framesScanned,
            matched: matched.map((number: any) => number.phoneNumber),
            missing: missing.map((number: any) => number.phoneNumber),
            note: `Pengecekan OCR lokal: ${matched.length}/${taskNumbers.length} nomor task cocok penuh pada ${framesScanned} frame (maksimal ${OCR_MAX_FRAMES_PER_VIDEO} frame per video). Digit tambahan sebelum atau sesudah nomor tidak dihitung sebagai cocok. OCR tidak menjamin akurasi 100%; periksa video secara langsung.`,
          };
          job.updatedAt = Date.now();
        }
      } catch (err: any) {
        const job = numberCheckJobs.get(jobId);
        if (job) {
          job.status = 'failed';
          job.error = `Pengecekan nomor gagal: ${err.message}`;
          job.updatedAt = Date.now();
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: `Pengecekan nomor gagal: ${err.message}` });
  }
});

app.get('/api/number-check-jobs/:jobId', (req, res) => {
  const job = numberCheckJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Pekerjaan pemeriksaan tidak ditemukan atau sudah kedaluwarsa' });
  if (job.status === 'failed') return res.status(500).json({ status: job.status, error: job.error });
  res.json({ status: job.status, ...(job.result ? { result: job.result } : {}) });
});

// 11. Upload Video Proof (Real Multer Upload)
app.post('/api/tasks/:id/upload-proof', upload.single('video'), async (req, res) => {
  try {
    const taskId = req.params.id;
    let fileName = '';
    let fileSize = '';
    let fileUrl = '';

    if (req.file) {
      fileName = req.file.originalname;
      fileSize = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`;
      fileUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.mockUrl) {
      fileName = req.body.fileName || 'screen_recording_proof.mp4';
      fileSize = req.body.fileSize || '24.5 MB';
      fileUrl = req.body.mockUrl;
    } else {
      return res.status(400).json({ error: 'Tidak ada berkas video yang diunggah' });
    }

    const videoId = `vid-${Date.now()}`;
    const uploadedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

    await execute(
      `INSERT INTO proof_videos (id, task_id, file_name, file_size, file_url, duration, uploaded_at)
       VALUES (?, ?, ?, ?, ?, '02:30', ?)`,
      [videoId, taskId, fileName, fileSize, fileUrl, uploadedAt]
    );

    const updated = await getFullTask(taskId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Delete Video Proof
app.delete('/api/tasks/:id/proof/:videoId', async (req, res) => {
  try {
    const { id: taskId, videoId } = req.params;
    await execute('DELETE FROM proof_videos WHERE id = ? AND task_id = ?', [videoId, taskId]);
    const updated = await getFullTask(taskId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Submit Task For Review
app.post('/api/tasks/:id/submit', async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await getFullTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task tidak ditemukan' });

    const completedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    await execute(
      `UPDATE tasks
       SET status = 'submitted',
           completed_at = ?,
           submitted_at = ?
       WHERE id = ?`,
      [completedAt, completedAt, taskId]
    );

    const updated = await getFullTask(taskId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Admin Review Task (Diterima / Dibatalkan)
app.post('/api/tasks/:id/review', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { verdict, notes, verifiedCount, reviewer } = req.body;
    if (!verdict || (verdict !== 'approved' && verdict !== 'rejected')) {
      return res.status(400).json({ error: 'Verdict harus approved atau rejected' });
    }

    const task = await getFullTask(taskId);
    if (!task) return res.status(404).json({ error: 'Task tidak ditemukan' });

    const doneCount = task.numbers.filter((n: any) => n.status === 'done').length;
    const finalVerified = verdict === 'approved' ? (verifiedCount !== undefined ? verifiedCount : doneCount) : 0;
    const reviewedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

    await execute('UPDATE tasks SET status = ? WHERE id = ?', [verdict, taskId]);

    // Upsert review
    await execute('DELETE FROM task_reviews WHERE task_id = ?', [taskId]);
    await execute(
      `INSERT INTO task_reviews (task_id, reviewed_by, reviewed_at, status, initial_count, verified_count, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [taskId, reviewer || 'Admin', reviewedAt, verdict, doneCount, finalVerified, notes || '']
    );

    const updated = await getFullTask(taskId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Toggle Payment
app.post('/api/tasks/:id/toggle-payment', async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await queryOne('SELECT payment_status FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task tidak ditemukan' });

    const nextStatus = task.payment_status === 'unpaid' ? 'paid' : 'unpaid';
    await execute('UPDATE tasks SET payment_status = ? WHERE id = ?', [nextStatus, taskId]);

    const updated = await getFullTask(taskId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Real dynamic stats from SQLite
app.get('/api/stats', async (req, res) => {
  try {
    const requestedDate = typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date : new Date().toISOString().slice(0, 10);
    const totalDoneRow = await queryOne(
      "SELECT COUNT(*) as c FROM task_numbers n JOIN tasks t ON t.id = n.task_id WHERE n.status = 'done' AND t.status = 'approved' AND date(COALESCE(t.completed_at, n.updated_at)) = ?", [requestedDate]
    );
    const totalFailedRow = await queryOne(
      "SELECT COUNT(*) as c FROM task_numbers n JOIN tasks t ON t.id = n.task_id WHERE n.status = 'failed' AND t.status = 'approved' AND date(COALESCE(t.completed_at, n.updated_at)) = ?", [requestedDate]
    );
    const submittedTasksRow = await queryOne(
      "SELECT COUNT(*) as c FROM tasks WHERE status IN ('submitted', 'approved', 'rejected') AND date(COALESCE(completed_at, created_at)) = ?", [requestedDate]
    );
    const activeWorkersRow = await queryOne(
      'SELECT COUNT(*) as c FROM operators WHERE is_active = 1'
    );
    const availableTasksRow = await queryOne(
      "SELECT COUNT(*) as c FROM tasks WHERE status = 'available'"
    );
    const inProgressTasksRow = await queryOne(
      "SELECT COUNT(*) as c FROM tasks WHERE status = 'in_progress'"
    );
    const hourlyRows = await queryAll(
      `SELECT
         CAST(strftime('%H', updated_at) AS INTEGER) AS hour,
         SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM task_numbers
       JOIN tasks t ON t.id = task_numbers.task_id
       WHERE updated_at IS NOT NULL AND t.status = 'approved' AND date(COALESCE(t.completed_at, updated_at)) = ?
       GROUP BY hour`
    );
    const hourlyCompleted = Array(24).fill(0);
    const hourlyFailed = Array(24).fill(0);
    hourlyRows.forEach((row) => {
      if (row.hour >= 0 && row.hour < 24) {
        hourlyCompleted[row.hour] = row.completed || 0;
        hourlyFailed[row.hour] = row.failed || 0;
      }
      }, [requestedDate]);

    res.json({
      completedNumbers: totalDoneRow?.c || 0,
      failedNumbers: totalFailedRow?.c || 0,
      submittedTasks: submittedTasksRow?.c || 0,
      activeWorkers: activeWorkersRow?.c || 0,
      availableTasks: availableTasksRow?.c || 0,
      inProgressTasks: inProgressTasksRow?.c || 0,
      hourlyCompleted,
      hourlyFailed,
      date: requestedDate,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mount Vite middleware for dev or serve dist in production
async function startServer() {
  const server = http.createServer(app);

  // Initialize SQLite database
  await getDb();
  await execute(`
    INSERT OR IGNORE INTO admins (id, username, password, created_at, role)
    VALUES ('adm-primary', 'admin', 'admin123', '2026-10-24 00:00', 'super_admin');
    INSERT OR IGNORE INTO admins (id, username, password, created_at, role)
    VALUES ('adm-worktheadmin', 'worktheadmin', 'admin123', '2026-10-24 00:00', 'super_admin');
    INSERT OR IGNORE INTO workers (id, username, password, created_at, role)
    VALUES ('worker-primary', 'GasTerus', 'Gas12', '2026-10-24 00:00', 'worker');
    UPDATE workers SET password = 'Gas12' WHERE LOWER(username) = 'gasterus';
  `);
  console.log('[SQLite] Database initialized with admin (worktheadmin/admin123) & worker (GasTerus/Gas12)');

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR !== 'false';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      // Don't intercept API or static uploads
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
