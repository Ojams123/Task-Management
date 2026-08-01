import { getDb } from '../index'
import type { WeatherSnapshot } from '../../../src/shared/types'

const ROW_ID = 'current'

interface WeatherRow {
  locationName: string
  tempF: number | null
  feelsLikeF: number | null
  condition: string | null
  icon: string | null
  humidity: number | null
  windMph: number | null
  forecastJson: string
  syncedAt: string
}

export function saveSnapshot(snapshot: WeatherSnapshot) {
  const db = getDb()
  db.prepare(
    `INSERT INTO weather_cache (id, locationName, tempF, feelsLikeF, condition, icon, humidity, windMph, forecastJson, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       locationName = excluded.locationName,
       tempF = excluded.tempF,
       feelsLikeF = excluded.feelsLikeF,
       condition = excluded.condition,
       icon = excluded.icon,
       humidity = excluded.humidity,
       windMph = excluded.windMph,
       forecastJson = excluded.forecastJson,
       syncedAt = excluded.syncedAt`
  ).run(
    ROW_ID,
    snapshot.locationName,
    snapshot.tempF,
    snapshot.feelsLikeF,
    snapshot.condition,
    snapshot.icon,
    snapshot.humidity,
    snapshot.windMph,
    JSON.stringify(snapshot.forecast),
    snapshot.syncedAt
  )
}

export function getCachedSnapshot(): WeatherSnapshot | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM weather_cache WHERE id = ?').get(ROW_ID) as WeatherRow | undefined
  if (!row) return null
  return {
    locationName: row.locationName,
    tempF: row.tempF,
    feelsLikeF: row.feelsLikeF,
    condition: row.condition,
    icon: row.icon,
    humidity: row.humidity,
    windMph: row.windMph,
    forecast: JSON.parse(row.forecastJson),
    syncedAt: row.syncedAt,
  }
}
