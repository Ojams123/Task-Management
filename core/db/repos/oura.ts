import { getDb } from '../index'
import type { OuraDailySummary } from '../../../src/shared/types'

interface OuraRow extends OuraDailySummary {
  syncedAt: string
}

export function replaceCachedOuraDays(days: OuraDailySummary[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  const tx = db.transaction((rows: OuraDailySummary[]) => {
    const upsert = db.prepare(
      `INSERT INTO oura_daily (date, sleepScore, readinessScore, activityScore, totalSleepMinutes, steps, activeCalories, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         sleepScore = excluded.sleepScore,
         readinessScore = excluded.readinessScore,
         activityScore = excluded.activityScore,
         totalSleepMinutes = excluded.totalSleepMinutes,
         steps = excluded.steps,
         activeCalories = excluded.activeCalories,
         syncedAt = excluded.syncedAt`
    )
    for (const d of rows) {
      upsert.run(
        d.date,
        d.sleepScore,
        d.readinessScore,
        d.activityScore,
        d.totalSleepMinutes,
        d.steps,
        d.activeCalories,
        syncedAt
      )
    }
  })
  tx(days)
}

export function listCachedOuraDays(): OuraDailySummary[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM oura_daily ORDER BY date DESC LIMIT 30').all() as OuraRow[]
  return rows.map(({ syncedAt: _syncedAt, ...rest }) => rest)
}
