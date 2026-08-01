import { getDb } from '../index'
import type { MicrosoftSnapshot } from '../../integrations/microsoft'

const ROW_ID = 'current'

interface MicrosoftRow {
  displayName: string | null
  unreadCount: number | null
  unreadItemsJson: string
  recentFilesJson: string
  syncedAt: string
}

export function saveSnapshot(snapshot: MicrosoftSnapshot) {
  const db = getDb()
  db.prepare(
    `INSERT INTO microsoft_cache (id, displayName, unreadCount, unreadItemsJson, recentFilesJson, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       displayName = excluded.displayName,
       unreadCount = excluded.unreadCount,
       unreadItemsJson = excluded.unreadItemsJson,
       recentFilesJson = excluded.recentFilesJson,
       syncedAt = excluded.syncedAt`
  ).run(
    ROW_ID,
    snapshot.displayName,
    snapshot.unreadCount,
    JSON.stringify(snapshot.unreadItems),
    JSON.stringify(snapshot.recentFiles),
    new Date().toISOString()
  )
}

export function getCachedSnapshot(): (MicrosoftSnapshot & { syncedAt: string }) | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM microsoft_cache WHERE id = ?').get(ROW_ID) as MicrosoftRow | undefined
  if (!row) return null
  return {
    displayName: row.displayName ?? '',
    unreadCount: row.unreadCount ?? 0,
    unreadItems: JSON.parse(row.unreadItemsJson),
    recentFiles: JSON.parse(row.recentFilesJson),
    syncedAt: row.syncedAt,
  }
}
