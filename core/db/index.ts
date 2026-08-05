import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { getDataDir } from '../adapters'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db

  const userDataPath = getDataDir()
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

    CREATE TABLE IF NOT EXISTS sessions (
      tokenHash TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT,
      allDay INTEGER NOT NULL DEFAULT 0,
      location TEXT,
      htmlLink TEXT,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_entries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      calories REAL NOT NULL,
      protein REAL,
      carbs REAL,
      fat REAL,
      consumedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exercise_entries (
      id TEXT PRIMARY KEY,
      activity TEXT NOT NULL,
      durationMinutes REAL,
      caloriesBurned REAL,
      notes TEXT,
      occurredAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS oura_daily (
      date TEXT PRIMARY KEY,
      sleepScore REAL,
      readinessScore REAL,
      activityScore REAL,
      totalSleepMinutes REAL,
      steps REAL,
      activeCalories REAL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plaid_items (
      id TEXT PRIMARY KEY,
      accessToken TEXT NOT NULL,
      institutionName TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plaid_accounts (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      mask TEXT,
      type TEXT,
      subtype TEXT,
      currentBalance REAL,
      availableBalance REAL,
      isoCurrencyCode TEXT,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plaid_transactions (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL REFERENCES plaid_accounts(id) ON DELETE CASCADE,
      itemId TEXT NOT NULL,
      amount REAL NOT NULL,
      isoCurrencyCode TEXT,
      category TEXT,
      merchantName TEXT,
      name TEXT NOT NULL,
      pending INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spotify_cache (
      id TEXT PRIMARY KEY,
      displayName TEXT,
      imageUrl TEXT,
      recentTracksJson TEXT NOT NULL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS strava_cache (
      id TEXT PRIMARY KEY,
      athleteName TEXT,
      activitiesJson TEXT NOT NULL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS microsoft_cache (
      id TEXT PRIMARY KEY,
      displayName TEXT,
      unreadCount INTEGER,
      unreadItemsJson TEXT NOT NULL,
      recentFilesJson TEXT NOT NULL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS canvas_local_completion (
      assignmentId TEXT PRIMARY KEY,
      completedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS linkedin_profile (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      pictureUrl TEXT,
      connectedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS simplefin_accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      orgName TEXT,
      currency TEXT,
      balance REAL,
      availableBalance REAL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS simplefin_transactions (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL REFERENCES simplefin_accounts(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      pending INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weather_cache (
      id TEXT PRIMARY KEY,
      locationName TEXT NOT NULL,
      tempF REAL,
      feelsLikeF REAL,
      condition TEXT,
      icon TEXT,
      humidity REAL,
      windMph REAL,
      forecastJson TEXT NOT NULL,
      syncedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS journal_items (
      id TEXT PRIMARY KEY,
      listId TEXT NOT NULL REFERENCES journal_lists(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      notes TEXT,
      checked INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
  `)

  const transactionColumns = database.prepare("PRAGMA table_info(transactions)").all() as { name: string }[]
  if (!transactionColumns.some((c) => c.name === 'plaidTransactionId')) {
    database.exec('ALTER TABLE transactions ADD COLUMN plaidTransactionId TEXT')
  }
  if (!transactionColumns.some((c) => c.name === 'simplefinTransactionId')) {
    database.exec('ALTER TABLE transactions ADD COLUMN simplefinTransactionId TEXT')
  }
}

export function closeDb() {
  if (db) {
    db.close()
    db = null
  }
}
