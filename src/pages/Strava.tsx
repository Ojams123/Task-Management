import { useEffect, useState } from 'react'
import type { StravaSnapshot } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { StravaIcon } from '../components/icons'

export function Strava({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [snapshot, setSnapshot] = useState<StravaSnapshot | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
  )
}
