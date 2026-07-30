import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { getDb } from '../index'

// Passcode-gated auth for browser/server mode only — the Electron desktop
// app never touches this (physical device access is the access control
// there). Kept in the shared DB so it's just more tables, not a new store.

const SCRYPT_KEYLEN = 64
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const SESSION_PEPPER = 'devicehub-session-v1'

export function hasPasscode(): boolean {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'auth.passcode'").get() as
    | { value: string }
    | undefined
  return !!row
}

export function setPasscode(passcode: string) {
  const db = getDb()
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(passcode, salt, SCRYPT_KEYLEN).toString('hex')
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('auth.passcode', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(`${salt}:${hash}`)
}

export function verifyPasscode(passcode: string): boolean {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'auth.passcode'").get() as
    | { value: string }
    | undefined
  if (!row) return false
  const [salt, hash] = row.value.split(':')
  const candidate = scryptSync(passcode, salt, SCRYPT_KEYLEN)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

function hashToken(token: string): string {
  return scryptSync(token, SESSION_PEPPER, 32).toString('hex')
}

export function createSession(): { token: string; expiresAt: string } {
  const db = getDb()
  const token = randomBytes(32).toString('hex')
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.prepare('INSERT INTO sessions (tokenHash, createdAt, expiresAt) VALUES (?, ?, ?)').run(
    hashToken(token),
    createdAt,
    expiresAt
  )
  return { token, expiresAt }
}

export function isValidSession(token: string): boolean {
  const db = getDb()
  const row = db.prepare('SELECT expiresAt FROM sessions WHERE tokenHash = ?').get(hashToken(token)) as
    | { expiresAt: string }
    | undefined
  if (!row) return false
  return new Date(row.expiresAt).getTime() > Date.now()
}

export function deleteSession(token: string) {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE tokenHash = ?').run(hashToken(token))
}
