import { useEffect, useState } from 'react'
import type { StravaActivitySummary, StravaSnapshot } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { StravaIcon } from '../components/icons'
import { Glyph } from '../components/Glyph'
import { Sparkline } from '../components/Sparkline'

const ACTIVITY_TYPES = ['Run', 'Ride', 'Walk', 'Swim', 'Hike', 'Workout', 'Yoga', 'WeightTraining']
const STRAVA_ORANGE = '#FC4C02'

function defaultStart(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function formatPace(movingMinutes: number, distanceMiles: number): string | null {
  if (!distanceMiles) return null
  const paceMin = movingMinutes / distanceMiles
  const min = Math.floor(paceMin)
  const sec = Math.round((paceMin - min) * 60)
  return `${min}:${String(sec).padStart(2, '0')} /mi`
}

// Consecutive weeks (most recent first) with at least one logged activity —
// an in-progress current week with nothing logged yet doesn't zero out an
// otherwise-active streak, it just starts counting from last week instead.
function computeWeekStreak(activities: StravaActivitySummary[], now: Date): number {
  const hasActivityInWeek = (weekStart: Date) => {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return activities.some((a) => {
      const d = new Date(a.startDate)
      return d >= weekStart && d < weekEnd
    })
  }
  let cursor = startOfWeek(now)
  if (!hasActivityInWeek(cursor)) {
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - 7)
  }
  let streak = 0
  while (hasActivityInWeek(cursor)) {
    streak++
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - 7)
  }
  return streak
}

export function Strava({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [snapshot, setSnapshot] = useState<StravaSnapshot | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState(ACTIVITY_TYPES[0])
  const [startDate, setStartDate] = useState(defaultStart())
  const [duration, setDuration] = useState('30')
  const [distance, setDistance] = useState('')
  const [logging, setLogging] = useState(false)

  async function refresh() {
    const status = await window.api.strava.getStatus()
    setConnected(status.connected)
    if (status.connected) setSnapshot(await window.api.strava.getCached())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function sync() {
    setSyncing(true)
    setError(null)
    try {
      setSnapshot(await window.api.strava.sync())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function logActivity() {
    const durationMinutes = Number(duration)
    if (!name.trim() || !durationMinutes) return
    setLogging(true)
    setError(null)
    try {
      setSnapshot(
        await window.api.strava.createActivity({
          name: name.trim(),
          type,
          startDate,
          durationMinutes,
          distanceMiles: distance ? Number(distance) : undefined,
        })
      )
      setName('')
      setDuration('30')
      setDistance('')
      setStartDate(defaultStart())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log activity')
    } finally {
      setLogging(false)
    }
  }

  const activities = snapshot?.activities ?? []
  const now = new Date()
  const thisWeekStart = startOfWeek(now)
  const thisWeekActivities = activities.filter((a) => new Date(a.startDate) >= thisWeekStart)
  const weekDistance = thisWeekActivities.reduce((sum, a) => sum + a.distanceMiles, 0)
  const weekMinutes = thisWeekActivities.reduce((sum, a) => sum + a.movingMinutes, 0)
  const weekStreak = computeWeekStreak(activities, now)

  const trendPoints = Array.from({ length: 12 }, (_, i) => {
    const weeksAgo = 11 - i
    const weekStart = new Date(thisWeekStart)
    weekStart.setDate(weekStart.getDate() - weeksAgo * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const miles = activities
      .filter((a) => {
        const d = new Date(a.startDate)
        return d >= weekStart && d < weekEnd
      })
      .reduce((sum, a) => sum + a.distanceMiles, 0)
    return {
      label: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(miles * 10) / 10,
    }
  })

  if (connected === false) {
    return (
      <div className="card">
        <h3>
          <span className="heading-with-icon">
            <StravaIcon size={20} />
            Connect Strava
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Connect your Strava account in Settings to see your recent activities here.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Log an activity</h3>
        <div className="form-grid">
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning run" />
          </div>
          <div className="field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Start</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Duration (min)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="field">
            <label>Distance (mi, optional)</label>
            <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="3.1" />
          </div>
          <button className="btn btn-primary" onClick={logActivity} disabled={logging}>
            {logging ? 'Logging…' : 'Log activity'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="muted" style={{ color: 'var(--danger)', margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {activities.length > 0 && (
        <div className="grid-editorial" style={{ marginBottom: 20 }}>
          <div className="card hero-card span-2">
            <div className="hero-label">This week</div>
            <div className="hero-value" style={{ color: STRAVA_ORANGE }}>
              {weekDistance.toFixed(1)} mi
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              {formatDuration(weekMinutes)} across {thisWeekActivities.length} activit
              {thisWeekActivities.length === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <div className="card strava-streak-card span-1">
            <h3>Streak</h3>
            <div className="strava-streak-flame" aria-hidden="true">
              🔥
            </div>
            <div className="strava-streak-count">{weekStreak}</div>
            <div className="muted">{weekStreak === 1 ? 'week' : 'weeks'}</div>
          </div>
          <div className="card span-1">
            <div className="stat">
              <span className="stat-label">Activities</span>
              <span className="hero-value" style={{ fontSize: 34 }}>{thisWeekActivities.length}</span>
            </div>
          </div>
          <div className="card span-4">
            <h3>Past 12 weeks</h3>
            <Sparkline points={trendPoints} color={STRAVA_ORANGE} formatValue={(v) => `${v} mi`} />
          </div>
        </div>
      )}

      <div className="card">
        <h3>
          <span className="heading-with-icon">
            <StravaIcon size={20} />
            {snapshot?.athleteName || 'Recent activities'}
          </span>
          <button className="btn btn-sm" onClick={sync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </h3>
        {!snapshot || activities.length === 0 ? (
          <div className="empty-state">No data synced yet — click "Sync".</div>
        ) : (
          <div>
            {activities.map((activity) => {
              const pace = formatPace(activity.movingMinutes, activity.distanceMiles)
              return (
                <div className="strava-activity-row" key={activity.id}>
                  <div className="strava-activity-header">
                    <Glyph label={activity.type} />
                    <div className="fin-row-main">
                      <div className="fin-row-title">{activity.name}</div>
                      <div className="fin-row-sub">
                        {activity.type} ·{' '}
                        {new Date(activity.startDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="strava-activity-stats">
                    {activity.distanceMiles > 0 && (
                      <div className="strava-activity-stat">
                        <span className="strava-activity-stat-label">Distance</span>
                        <span className="strava-activity-stat-value">{activity.distanceMiles} mi</span>
                      </div>
                    )}
                    {pace && (
                      <div className="strava-activity-stat">
                        <span className="strava-activity-stat-label">Pace</span>
                        <span className="strava-activity-stat-value">{pace}</span>
                      </div>
                    )}
                    <div className="strava-activity-stat">
                      <span className="strava-activity-stat-label">Time</span>
                      <span className="strava-activity-stat-value">{formatDuration(activity.movingMinutes)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
