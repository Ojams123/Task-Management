import { getDb } from '../index'
import type { LinkedInProfile } from '../../integrations/linkedin'

const ROW_ID = 'current'

interface LinkedInRow {
  name: string | null
  email: string | null
  pictureUrl: string | null
  connectedAt: string
}

export function saveProfile(profile: LinkedInProfile) {
  const db = getDb()
  db.prepare(
    `INSERT INTO linkedin_profile (id, name, email, pictureUrl, connectedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       email = excluded.email,
       pictureUrl = excluded.pictureUrl,
       connectedAt = excluded.connectedAt`
  ).run(ROW_ID, profile.name, profile.email, profile.pictureUrl, new Date().toISOString())
}

export function getProfile(): (LinkedInProfile & { connectedAt: string }) | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM linkedin_profile WHERE id = ?').get(ROW_ID) as LinkedInRow | undefined
  if (!row) return null
  return { name: row.name ?? '', email: row.email, pictureUrl: row.pictureUrl, connectedAt: row.connectedAt }
}

export function clearProfile() {
  const db = getDb()
  db.prepare('DELETE FROM linkedin_profile WHERE id = ?').run(ROW_ID)
}
