import { getDb } from '../index'
import type { SpotifyProfile, SpotifyRecentTrack } from '../../integrations/spotify'

const ROW_ID = 'current'

interface SpotifyRow {
  displayName: string | null
  imageUrl: string | null
  recentTracksJson: string
  syncedAt: string
}

export function saveSnapshot(profile: SpotifyProfile, recentlyPlayed: SpotifyRecentTrack[]) {
  const db = getDb()
  db.prepare(
    `INSERT INTO spotify_cache (id, displayName, imageUrl, recentTracksJson, syncedAt)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       displayName = excluded.displayName,
       imageUrl = excluded.imageUrl,
       recentTracksJson = excluded.recentTracksJson,
       syncedAt = excluded.syncedAt`
  ).run(ROW_ID, profile.displayName, profile.imageUrl, JSON.stringify(recentlyPlayed), new Date().toISOString())
}

export function getCachedSnapshot(): { profile: SpotifyProfile; recentlyPlayed: SpotifyRecentTrack[]; syncedAt: string } | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM spotify_cache WHERE id = ?').get(ROW_ID) as SpotifyRow | undefined
  if (!row) return null
  return {
    profile: { displayName: row.displayName ?? '', imageUrl: row.imageUrl },
    recentlyPlayed: JSON.parse(row.recentTracksJson),
    syncedAt: row.syncedAt,
  }
}
