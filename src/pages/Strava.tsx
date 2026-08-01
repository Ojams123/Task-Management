import { useEffect, useState } from 'react'
import type { StravaSnapshot } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { StravaIcon } from '../components/icons'

const ACTIVITY_TYPES = ['Run', 'Ride', 'Walk', 'Swim', 'Hike', 'Workout', 'Yoga', 'WeightTraining']

function defaultStart(): string {
  const d = new Date()
  d.setSeconds(0, 0)
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16)
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
        {error && (
          <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
            {error}
          </p>
        )}
        {!snapshot || snapshot.activities.length === 0 ? (
          <div className="empty-state">No data synced yet — click "Sync".</div>
        ) : (
          <div className="list">
            {snapshot.activities.map((activity) => (
              <div className="list-row" key={activity.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{activity.name}</div>
                  <div className="list-row-sub">
                    {activity.type} · {new Date(activity.startDate).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                <div className="list-row-actions">
                  <span className="badge">{activity.distanceMiles} mi</span>
                  <span className="badge">{activity.movingMinutes} min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
