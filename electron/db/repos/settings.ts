import { safeStorage } from 'electron'
import { getDb } from '../index'

// Simple encrypted key/value store for secrets (API tokens, OAuth credentials).
// Values are encrypted at rest via Electron's OS-level safeStorage when available,
// falling back to plaintext only if the OS keychain is unavailable (e.g. some Linux setups).

function encode(value: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(value).toString('base64')
  }
  return `plain:${value}`
}

function decode(stored: string): string {
  if (stored.startsWith('plain:')) {
    return stored.slice('plain:'.length)
  }
  return safeStorage.decryptString(Buffer.from(stored, 'base64'))
}

export function setSecret(key: string, value: string) {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, encode(value))
}

export function getSecret(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  if (!row || row.value == null) return null
  try {
    return decode(row.value)
  } catch {
    return null
  }
}

export function deleteSecret(key: string) {
  const db = getDb()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}
