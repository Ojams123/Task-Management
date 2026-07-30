import { useEffect, useState } from 'react'
import type { CalendarEvent } from '../shared/types'
import type { Page } from '../components/Sidebar'

export function Calendar({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const status = await window.api.notifications.getGoogleAuthStatus()
    setConnected(status.connected)
    if (status.connected) setEvents(await window.api.calendar.getEvents())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function sync() {
    setSyncing(true)
    setError(null)
    try {
      setEvents(await window.api.calendar.refreshEvents())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (connected === false) {
    return (
      <div className="card">
        <h3>Connect Google Calendar</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Calendar uses the same Google connection as Gmail notifications. Connect your Google account in
          Settings to see upcoming events here.
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="muted">Next 14 days</span>
          <button className="btn btn-primary" onClick={sync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync calendar'}
          </button>
        </div>
        {error && (
          <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Upcoming events</h3>
        {events.length === 0 ? (
          <div className="empty-state">No events synced yet — click "Sync calendar".</div>
        ) : (
          <div className="list">
            {events.map((e) => (
              <div className="list-row" key={e.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{e.title}</div>
                  <div className="list-row-sub">
                    {e.allDay
                      ? new Date(e.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                      : new Date(e.start).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                    {e.location && ` · ${e.location}`}
                  </div>
                </div>
                {e.htmlLink && (
                  <div className="list-row-actions">
                    <a className="btn btn-sm" href={e.htmlLink} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
