import { getDb } from '../index'
import type { StravaActivitySummary } from '../../integrations/strava'

const ROW_ID = 'current'

interface StravaRow {
  athleteName: string | null
  activitiesJson: string
  syncedAt: string
}

export function saveSnapshot(athleteName: string, activities: StravaActivitySummary[]) {
  const db = getDb()
  db.prepare(
    `INSERT INTO strava_cache (id, athleteName, activitiesJson, syncedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       athleteName = excluded.athleteName,
       activitiesJson = excluded.activitiesJson,
       syncedAt = excluded.syncedAt`
  ).run(ROW_ID, athleteName, JSON.stringify(activities), new Date().toISOString())
}

export function getCachedSnapshot(): { athleteName: string; activities: StravaActivitySummary[]; syncedAt: string } | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM strava_cache WHERE id = ?').get(ROW_ID) as StravaRow | undefined
  if (!row) return null
  return { athleteName: row.athleteName ?? '', activities: JSON.parse(row.activitiesJson), syncedAt: row.syncedAt }
}
