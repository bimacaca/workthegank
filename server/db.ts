import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'database.sqlite');

let db: Database | null = null;
let dbInitialization: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (dbInitialization) return dbInitialization;

  dbInitialization = (async () => {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    const SQL = await initSqlJs();
    const database = fs.existsSync(DB_FILE)
      ? new SQL.Database(fs.readFileSync(DB_FILE))
      : new SQL.Database();

    initTables(database);
    database.run('PRAGMA foreign_keys = ON');
    db = database;
    saveDb();
    return database;
  })().catch((error) => {
    dbInitialization = null;
    throw error;
  });

  return dbInitialization;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const tempFile = `${DB_FILE}.${process.pid}.tmp`;
  const fd = fs.openSync(tempFile, 'w');
  try {
    fs.writeFileSync(fd, buffer);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tempFile, DB_FILE);
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

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      operator_name TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      notes TEXT,
      rate_per_number INTEGER NOT NULL DEFAULT 500,
      amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT,
      review_note TEXT
    );

    CREATE TABLE IF NOT EXISTS withdrawal_request_tasks (
      request_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      verified_count INTEGER NOT NULL,
      PRIMARY KEY (request_id, task_id),
      FOREIGN KEY (request_id) REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_settings (setting_key, setting_value)
    VALUES ('withdrawal_rate_per_number', '500');

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

  for (const migration of [
    'ALTER TABLE withdrawal_requests ADD COLUMN rate_per_number INTEGER NOT NULL DEFAULT 500',
    'ALTER TABLE withdrawal_requests ADD COLUMN amount INTEGER NOT NULL DEFAULT 0',
  ]) {
    try {
      database.run(migration);
    } catch {
      // Existing installations may already have these columns.
    }
  }
}
