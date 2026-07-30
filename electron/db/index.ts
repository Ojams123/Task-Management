import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userDataPath = app.getPath('userData')
  fs.mkdirSync(userDataPath, { recursive: true })
  const dbPath = path.join(userDataPath, 'devicehub.sqlite3')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  migrate(db)

  return db
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      notes TEXT,
      dueAt TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none',
      completed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      lastFiredAt TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      targetValue REAL NOT NULL,
      currentValue REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '',
      dueDate TEXT,
      createdAt TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS goal_log (
      id TEXT PRIMARY KEY,
      goalId TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      delta REAL NOT NULL,
      note TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      monthlyLimit REAL NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'expense',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      description TEXT,
      occurredAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS canvas_assignments (
      id TEXT PRIMARY KEY,
      courseId TEXT NOT NULL,
      courseName TEXT NOT NULL,
      name TEXT NOT NULL,
      dueAt TEXT,
      htmlUrl TEXT NOT NULL,
      submitted INTEGER NOT NULL DEFAULT 0,
      pointsPossible REAL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
