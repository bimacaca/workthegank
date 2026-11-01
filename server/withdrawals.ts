import type { Express } from 'express';
import { getDb, saveDb } from './db.js';

type QueryRow = Record<string, any>;

async function queryAll(sql: string, params: any[] = []): Promise<QueryRow[]> {
  const db = await getDb();
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows: QueryRow[] = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
}

async function queryOne(sql: string, params: any[] = []): Promise<QueryRow | null> {
  return (await queryAll(sql, params))[0] || null;
}

const run = (db: Awaited<ReturnType<typeof getDb>>, sql: string, params: any[] = []) => db.run(sql, params);

function queryAllFromDb(db: Awaited<ReturnType<typeof getDb>>, sql: string, params: any[] = []): QueryRow[] {
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows: QueryRow[] = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
}

async function getWithdrawalRate(): Promise<number> {
  const setting = await queryOne("SELECT setting_value FROM app_settings WHERE setting_key = 'withdrawal_rate_per_number'");
  const rate = Number(setting?.setting_value ?? 500);
  return Number.isSafeInteger(rate) && rate >= 0 ? rate : 500;
}

export function registerWithdrawalRoutes(app: Express) {
  app.get('/api/withdrawals', async (req, res) => {
    try {
      const operatorName = String(req.query.operatorName || '').trim();
      if (!operatorName) return res.status(400).json({ error: 'Nama pengerja wajib diisi' });
      const ratePerNumber = await getWithdrawalRate();

      const eligibleTasks = await queryAll(`
        SELECT t.id, t.code, t.store, t.completed_at, r.verified_count
        FROM tasks t JOIN task_reviews r ON r.task_id = t.id AND r.status = 'approved'
        WHERE LOWER(t.operator_name) = LOWER(?) AND t.status = 'approved'
          AND COALESCE(t.payment_status, 'unpaid') = 'unpaid'
          AND r.verified_count > 0
          AND NOT EXISTS (
            SELECT 1 FROM withdrawal_request_tasks wrt
            JOIN withdrawal_requests wr ON wr.id = wrt.request_id AND wr.status = 'pending'
            WHERE wrt.task_id = t.id
          )
        ORDER BY datetime(COALESCE(t.completed_at, t.created_at)) DESC
      `, [operatorName]);
      const requests = await queryAll(`
        SELECT wr.*, COALESCE(SUM(wrt.verified_count), 0) AS total_verified, COUNT(wrt.task_id) AS task_count
        FROM withdrawal_requests wr LEFT JOIN withdrawal_request_tasks wrt ON wrt.request_id = wr.id
        WHERE LOWER(wr.operator_name) = LOWER(?) GROUP BY wr.id ORDER BY datetime(wr.created_at) DESC
      `, [operatorName]);

      res.json({
        eligibleTasks: eligibleTasks.map((task) => ({
          id: task.id, code: task.code, store: task.store, completedAt: task.completed_at,
          verifiedCount: Number(task.verified_count || 0),
          estimatedAmount: Number(task.verified_count || 0) * ratePerNumber,
        })),
        ratePerNumber,
        requests: requests.map((request) => ({
          id: request.id, bankName: request.bank_name, accountName: request.account_name,
          accountNumber: request.account_number, notes: request.notes, status: request.status,
          createdAt: request.created_at, reviewedAt: request.reviewed_at, reviewNote: request.review_note,
          totalVerified: Number(request.total_verified || 0), taskCount: Number(request.task_count || 0),
          ratePerNumber: Number(request.rate_per_number || 0), amount: Number(request.amount || 0),
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/withdrawals', async (req, res) => {
    try {
      const operatorName = String(req.body?.operatorName || '').trim();
      const bankName = String(req.body?.bankName || '').trim();
      const accountName = String(req.body?.accountName || '').trim();
      const accountNumber = String(req.body?.accountNumber || '').replace(/\s+/g, '');
      const taskIds = Array.isArray(req.body?.taskIds) ? [...new Set(req.body.taskIds.map(String))] : [];
      const notes = String(req.body?.notes || '').trim().slice(0, 500);
      if (!operatorName || !bankName || !accountName || !accountNumber || !taskIds.length) {
        return res.status(400).json({ error: 'Pilih task dan lengkapi detail rekening penerima' });
      }
      if (operatorName.length > 80 || bankName.length > 80 || accountName.length > 100 || accountNumber.length > 40) {
        return res.status(400).json({ error: 'Detail rekening melebihi batas karakter' });
      }

      const placeholders = taskIds.map(() => '?').join(',');
      const eligible = await queryAll(`
        SELECT t.id, r.verified_count FROM tasks t
        JOIN task_reviews r ON r.task_id = t.id AND r.status = 'approved'
        WHERE t.id IN (${placeholders}) AND LOWER(t.operator_name) = LOWER(?)
          AND t.status = 'approved' AND COALESCE(t.payment_status, 'unpaid') = 'unpaid'
          AND r.verified_count > 0
          AND NOT EXISTS (
            SELECT 1 FROM withdrawal_request_tasks wrt
            JOIN withdrawal_requests wr ON wr.id = wrt.request_id AND wr.status = 'pending'
            WHERE wrt.task_id = t.id
          )
      `, [...taskIds, operatorName]);
      if (eligible.length !== taskIds.length) {
        return res.status(409).json({ error: 'Sebagian task tidak lagi tersedia. Muat ulang daftar dan coba lagi.' });
      }

      const requestId = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const db = await getDb();
      try {
        run(db, 'BEGIN IMMEDIATE TRANSACTION');
        const reservedEligible = queryAllFromDb(db, `
          SELECT t.id, r.verified_count FROM tasks t
          JOIN task_reviews r ON r.task_id = t.id AND r.status = 'approved'
          WHERE t.id IN (${placeholders}) AND LOWER(t.operator_name) = LOWER(?)
            AND t.status = 'approved' AND COALESCE(t.payment_status, 'unpaid') = 'unpaid'
            AND r.verified_count > 0
            AND NOT EXISTS (
              SELECT 1 FROM withdrawal_request_tasks wrt
              JOIN withdrawal_requests wr ON wr.id = wrt.request_id AND wr.status = 'pending'
              WHERE wrt.task_id = t.id
            )
        `, [...taskIds, operatorName]);
        if (reservedEligible.length !== taskIds.length) {
          run(db, 'ROLLBACK');
          return res.status(409).json({ error: 'Task sudah masuk permintaan lain atau tidak lagi tersedia.' });
        }
        const setting = queryAllFromDb(db, "SELECT setting_value FROM app_settings WHERE setting_key = 'withdrawal_rate_per_number'")[0];
        const ratePerNumber = Number(setting?.setting_value ?? 500);
        const totalVerified = reservedEligible.reduce((sum, task) => sum + Number(task.verified_count || 0), 0);
        const amount = totalVerified * ratePerNumber;
        run(db, `INSERT INTO withdrawal_requests
          (id, operator_name, bank_name, account_name, account_number, notes, rate_per_number, amount, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`, [
          requestId, operatorName, bankName, accountName, accountNumber, notes,
          ratePerNumber, amount, new Date().toISOString(),
        ]);
        for (const task of reservedEligible) {
          run(db, 'INSERT INTO withdrawal_request_tasks (request_id, task_id, verified_count) VALUES (?, ?, ?)',
            [requestId, task.id, Number(task.verified_count || 0)]);
        }
        run(db, 'COMMIT');
        saveDb();
      } catch (error) {
        run(db, 'ROLLBACK');
        throw error;
      }
      res.status(201).json({ success: true, requestId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/withdrawals', async (_req, res) => {
    try {
      const requests = await queryAll(`
        SELECT wr.*, COALESCE(SUM(wrt.verified_count), 0) AS total_verified, COUNT(wrt.task_id) AS task_count
        FROM withdrawal_requests wr LEFT JOIN withdrawal_request_tasks wrt ON wrt.request_id = wr.id
        GROUP BY wr.id
        ORDER BY CASE wr.status WHEN 'pending' THEN 0 ELSE 1 END, datetime(wr.created_at) ASC
      `);
      const result = await Promise.all(requests.map(async (request) => {
        const tasks = await queryAll(`
          SELECT t.id, t.code, t.store, wrt.verified_count
          FROM withdrawal_request_tasks wrt JOIN tasks t ON t.id = wrt.task_id
          WHERE wrt.request_id = ? ORDER BY t.code
        `, [request.id]);
        return {
          id: request.id, operatorName: request.operator_name, bankName: request.bank_name,
          accountName: request.account_name, accountNumber: request.account_number, notes: request.notes,
          status: request.status, createdAt: request.created_at, reviewedAt: request.reviewed_at,
          reviewedBy: request.reviewed_by, reviewNote: request.review_note,
          totalVerified: Number(request.total_verified || 0), taskCount: Number(request.task_count || 0),
          ratePerNumber: Number(request.rate_per_number || 0), amount: Number(request.amount || 0),
          tasks: tasks.map((task) => ({ ...task, verifiedCount: Number(task.verified_count || 0) })),
        };
      }));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/withdrawal-rate', async (_req, res) => {
    try {
      res.json({ ratePerNumber: await getWithdrawalRate() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/withdrawal-rate', async (req, res) => {
    try {
      const ratePerNumber = Number(req.body?.ratePerNumber);
      if (!Number.isSafeInteger(ratePerNumber) || ratePerNumber < 0 || ratePerNumber > 1_000_000_000) {
        return res.status(400).json({ error: 'Tarif harus bilangan bulat antara Rp 0 dan Rp 1.000.000.000' });
      }
      const db = await getDb();
      run(db, "INSERT INTO app_settings (setting_key, setting_value) VALUES ('withdrawal_rate_per_number', ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value", [String(ratePerNumber)]);
      saveDb();
      res.json({ success: true, ratePerNumber });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/withdrawals/:id/review', async (req, res) => {
    try {
      const requestId = req.params.id;
      const status = req.body?.status;
      const reviewer = String(req.body?.reviewer || 'Admin').trim().slice(0, 80);
      const reviewNote = String(req.body?.reviewNote || '').trim().slice(0, 500);
      if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ error: 'Status pembayaran harus approved atau rejected' });
      }

      const db = await getDb();
      const request = await queryOne('SELECT * FROM withdrawal_requests WHERE id = ?', [requestId]);
      if (!request) return res.status(404).json({ error: 'Permintaan withdraw tidak ditemukan' });
      if (request.status !== 'pending') return res.status(409).json({ error: 'Permintaan ini sudah ditinjau' });
      const tasks = await queryAll(`
        SELECT wrt.task_id, t.status, t.payment_status FROM withdrawal_request_tasks wrt
        JOIN tasks t ON t.id = wrt.task_id WHERE wrt.request_id = ?
      `, [requestId]);
      if (!tasks.length) return res.status(409).json({ error: 'Permintaan tidak memiliki task aktif' });
      if (status === 'approved' && tasks.some((task) => task.status !== 'approved' || (task.payment_status || 'unpaid') !== 'unpaid')) {
        return res.status(409).json({ error: 'Status task berubah. Pembayaran tidak dapat disetujui sebelum diperiksa ulang.' });
      }

      try {
        run(db, 'BEGIN IMMEDIATE TRANSACTION');
        if (status === 'approved') {
          for (const task of tasks) {
            run(db, "UPDATE tasks SET payment_status = 'paid' WHERE id = ? AND status = 'approved' AND COALESCE(payment_status, 'unpaid') = 'unpaid'", [task.task_id]);
            if (db.getRowsModified() !== 1) throw new Error('Status salah satu task berubah saat verifikasi');
          }
        }
        run(db, `UPDATE withdrawal_requests SET status = ?, reviewed_at = ?, reviewed_by = ?, review_note = ?
          WHERE id = ? AND status = 'pending'`, [status, new Date().toISOString(), reviewer, reviewNote, requestId]);
        if (db.getRowsModified() !== 1) throw new Error('Permintaan sudah diproses oleh admin lain');
        run(db, 'COMMIT');
        saveDb();
      } catch (error) {
        run(db, 'ROLLBACK');
        throw error;
      }
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
