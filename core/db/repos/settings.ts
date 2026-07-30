import { getDb } from '../index'
import { getCryptoAdapter } from '../../adapters'

// Encrypted key/value store for secrets (API tokens, OAuth credentials).
// Actual encryption is provided by whichever host is running (Electron's
// safeStorage, or a server-side AES key) via the CryptoAdapter set at startup.

export function setSecret(key: string, value: string) {
  const db = getDb()
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, getCryptoAdapter().encrypt(value))
}

export function getSecret(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  if (!row || row.value == null) return null
  try {
    return getCryptoAdapter().decrypt(row.value)
  } catch {
    return null
  }
}

export function deleteSecret(key: string) {
  const db = getDb()
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}
