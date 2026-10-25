import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'database.sqlite');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  initTables(db);
  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function initTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS operators (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      pin TEXT NOT NULL,
      created_at TEXT NOT NULL,
      total_completed_tasks INTEGER DEFAULT 0,
      total_completed_numbers INTEGER DEFAULT 0,
      total_failed_numbers INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      store TEXT NOT NULL,
      batch TEXT NOT NULL,
      content TEXT NOT NULL,
      promo_image_url TEXT,
      operator_name TEXT,
      operator_pin TEXT,
      status TEXT NOT NULL, -- available, in_progress, submitted, approved, rejected
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT,
      submitted_at TEXT,
      payment_status TEXT DEFAULT 'unpaid'
    );

    CREATE TABLE IF NOT EXISTS task_numbers (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      no INTEGER NOT NULL,
      phone_number TEXT NOT NULL,
      status TEXT DEFAULT 'pending', -- pending, done, failed
      failed_reason TEXT,
      updated_at TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proof_videos (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size TEXT NOT NULL,
      file_url TEXT NOT NULL,
      duration TEXT,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_reviews (
      task_id TEXT PRIMARY KEY,
      reviewed_by TEXT NOT NULL,
      reviewed_at TEXT NOT NULL,
      status TEXT NOT NULL, -- approved, rejected
      initial_count INTEGER NOT NULL,
      verified_count INTEGER NOT NULL,
      notes TEXT,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL,
      role TEXT DEFAULT 'admin' -- super_admin, admin
    );

    CREATE TABLE IF NOT EXISTS workers (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL,
      role TEXT DEFAULT 'worker'
    );

    INSERT OR IGNORE INTO admins (id, username, password, created_at, role)
    VALUES ('adm-primary', 'admin', 'admin123', '2026-10-24 00:00', 'super_admin');

    INSERT OR IGNORE INTO admins (id, username, password, created_at, role)
    VALUES ('adm-worktheadmin', 'worktheadmin', 'admin123', '2026-10-24 00:00', 'super_admin');

    INSERT OR IGNORE INTO workers (id, username, password, created_at, role)
    VALUES ('worker-primary', 'GasTerus', 'Gas12', '2026-10-24 00:00', 'worker');

    UPDATE workers SET password = 'Gas12' WHERE LOWER(username) = 'gasterus';
  `);

  try {
    database.run('ALTER TABLE tasks ADD COLUMN promo_image_url TEXT');
  } catch {
    // Existing installations already have this optional column.
  }
}
