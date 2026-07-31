import type { OuraDailySummary } from '../../src/shared/types'

const BASE_URL = 'https://api.ouraring.com/v2/usercollection'

interface OuraApiResponse<T> {
  data: T[]
}

async function ouraFetch<T>(token: string, endpoint: string, startDate: string, endDate: string): Promise<T[]> {
  const url = `${BASE_URL}/${endpoint}?start_date=${startDate}&end_date=${endDate}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Oura API error ${res.status}: ${body || res.statusText}`)
  }
  const json = (await res.json()) as OuraApiResponse<T>
  return json.data ?? []
}

interface DailySleepEntry {
  day: string
  score: number | null
  total_sleep_duration?: number | null
}

interface DailyReadinessEntry {
  day: string
  score: number | null
}

interface DailyActivityEntry {
  day: string
  score: number | null
  steps?: number | null
  active_calories?: number | null
}

export async function fetchOuraSummary(token: string, days = 14): Promise<OuraDailySummary[]> {
  const endDate = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [sleep, readiness, activity] = await Promise.all([
    ouraFetch<DailySleepEntry>(token, 'daily_sleep', startDate, endDate),
    ouraFetch<DailyReadinessEntry>(token, 'daily_readiness', startDate, endDate),
    ouraFetch<DailyActivityEntry>(token, 'daily_activity', startDate, endDate),
  ])

  const byDate = new Map<string, OuraDailySummary>()

  function ensure(date: string): OuraDailySummary {
    let entry = byDate.get(date)
    if (!entry) {
      entry = {
        date,
        sleepScore: null,
        readinessScore: null,
        activityScore: null,
        totalSleepMinutes: null,
        steps: null,
        activeCalories: null,
      }
      byDate.set(date, entry)
    }
    return entry
  }

  for (const s of sleep) {
    const entry = ensure(s.day)
    entry.sleepScore = s.score ?? null
    entry.totalSleepMinutes = s.total_sleep_duration != null ? Math.round(s.total_sleep_duration / 60) : null
  }
  for (const r of readiness) {
    ensure(r.day).readinessScore = r.score ?? null
  }
  for (const a of activity) {
    const entry = ensure(a.day)
    entry.activityScore = a.score ?? null
    entry.steps = a.steps ?? null
    entry.activeCalories = a.active_calories ?? null
  }

  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date))
}
