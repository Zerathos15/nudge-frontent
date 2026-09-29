import initSqlJs, { type Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'mastery.sqlite');

let db: Database;

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

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  initSchema(db);
  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      user_agent TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      study_style TEXT DEFAULT 'practical',
      reminder_behavior TEXT DEFAULT 'standard',
      preferred_language TEXT DEFAULT 'en',
      display_theme TEXT DEFAULT 'system',
      study_intensity TEXT DEFAULT 'balanced',
      response_preference TEXT DEFAULT 'structured',
      personal_notes TEXT DEFAULT '',
      college_end_time TEXT DEFAULT '16:00',
      saturday_is_working INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS curriculum_versions (
      id TEXT PRIMARY KEY,
      version_number TEXT NOT NULL,
      title TEXT NOT NULL,
      source_filename TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      raw_text TEXT,
      parsed_metadata_json TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_versions (
      id TEXT PRIMARY KEY,
      version_number TEXT NOT NULL,
      title TEXT NOT NULL,
      source_filename TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      raw_text TEXT,
      parsed_rules_json TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS curriculum_tracks (
      id TEXT PRIMARY KEY,
      curriculum_version_id TEXT NOT NULL,
      track_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#4f46e5',
      ordering INTEGER DEFAULT 0,
      FOREIGN KEY (curriculum_version_id) REFERENCES curriculum_versions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS curriculum_modules (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL,
      module_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      ordering INTEGER DEFAULT 0,
      FOREIGN KEY (track_id) REFERENCES curriculum_tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS curriculum_topics (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      curriculum_version_id TEXT NOT NULL,
      topic_number INTEGER NOT NULL,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      task_type TEXT NOT NULL DEFAULT 'THEORY',
      estimated_minutes INTEGER DEFAULT 60,
      requires_mastery INTEGER DEFAULT 1,
      ordering INTEGER DEFAULT 0,
      FOREIGN KEY (module_id) REFERENCES curriculum_modules(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES curriculum_tracks(id) ON DELETE CASCADE,
      FOREIGN KEY (curriculum_version_id) REFERENCES curriculum_versions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS curriculum_prerequisites (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      prerequisite_topic_id TEXT,
      prerequisite_code TEXT NOT NULL,
      is_mandatory INTEGER DEFAULT 1,
      FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_rules (
      id TEXT PRIMARY KEY,
      schedule_version_id TEXT NOT NULL,
      day_type TEXT NOT NULL,
      window_start TEXT NOT NULL,
      window_end TEXT NOT NULL,
      max_continuous_minutes INTEGER DEFAULT 60,
      break_minutes INTEGER DEFAULT 15,
      max_daily_hours REAL DEFAULT 5,
      track_allocation_json TEXT,
      FOREIGN KEY (schedule_version_id) REFERENCES schedule_versions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_checkpoints (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      track_key TEXT NOT NULL,
      curriculum_version_id TEXT NOT NULL,
      current_module_id TEXT,
      current_topic_id TEXT,
      completed_count INTEGER DEFAULT 0,
      remaining_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      mastery_state TEXT DEFAULT 'IN_PROGRESS',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (curriculum_version_id) REFERENCES curriculum_versions(id) ON DELETE CASCADE,
      UNIQUE(user_id, track_key, curriculum_version_id)
    );

    CREATE TABLE IF NOT EXISTS user_scheduled_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      curriculum_version_id TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_slot_start TEXT NOT NULL,
      scheduled_slot_end TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      original_date TEXT NOT NULL,
      rescheduled_date TEXT,
      completed_at TEXT,
      notes TEXT,
      priority INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE,
      FOREIGN KEY (curriculum_version_id) REFERENCES curriculum_versions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_evidence (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      scheduled_task_id TEXT,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      text_content TEXT,
      ai_status TEXT NOT NULL DEFAULT 'PENDING',
      ai_analysis_json TEXT,
      user_notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE,
      FOREIGN KEY (scheduled_task_id) REFERENCES user_scheduled_tasks(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS user_mastery_tests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      scheduled_task_id TEXT,
      questions_json TEXT NOT NULL,
      answers_json TEXT,
      score REAL,
      passed INTEGER DEFAULT 0,
      ai_feedback TEXT,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES curriculum_topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_research_milestones (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      paper_or_experiment TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'LITERATURE_REVIEW',
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      notes TEXT,
      topic_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      full_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON user_scheduled_tasks(user_id, scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_evidence_user ON user_evidence(user_id);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_user ON user_checkpoints(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_email_verif ON email_verifications(email);
    CREATE INDEX IF NOT EXISTS idx_pwd_resets_token ON password_resets(token);
  `);
}

// SQL query helper methods
export function queryAll<T = any>(database: Database, sql: string, params: any[] = []): T[] {
  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(database: Database, sql: string, params: any[] = []): T | null {
  const results = queryAll<T>(database, sql, params);
  return results.length > 0 ? results[0] : null;
}

export function executeRun(database: Database, sql: string, params: any[] = []): void {
  database.run(sql, params);
  saveDb();
}
