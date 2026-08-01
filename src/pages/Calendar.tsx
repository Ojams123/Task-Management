import { useEffect, useState } from 'react'
import type { CalendarEvent } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { WeekCalendar } from '../components/WeekCalendar'

function defaultStart(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  return d.toISOString().slice(0, 16)
}

export function Calendar({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [assignmentEvents, setAssignmentEvents] = useState<CalendarEvent[]>([])
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [start, setStart] = useState(defaultStart())
  const [location, setLocation] = useState('')
  const [creating, setCreating] = useState(false)

  async function refreshAssignments() {
    const assignments = await window.api.canvas.listCached()
    setAssignmentEvents(
      assignments
        .filter((a) => !a.submitted && a.dueAt)
        .map((a) => ({
          id: `canvas-${a.id}`,
          title: `${a.name} (${a.courseName})`,
          start: a.dueAt as string,
          end: null,
          allDay: false,
          location: a.courseName,
          htmlLink: a.htmlUrl,
          source: 'canvas' as const,
        }))
    )
  }

  async function refresh() {
    const status = await window.api.notifications.getGoogleAuthStatus()
    setConnected(status.connected)
    if (status.connected) setEvents(await window.api.calendar.getEvents())
    await refreshAssignments()
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

  async function addEvent() {
    if (!title.trim() || !start) return
    setCreating(true)
    setError(null)
    try {
      setEvents(
        await window.api.calendar.createEvent({
          title: title.trim(),
          start: new Date(start).toISOString(),
          end: null,
          allDay: false,
          location: location.trim() || null,
        })
      )
      setTitle('')
      setLocation('')
      setStart(defaultStart())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create event')
    } finally {
      setCreating(false)
    }
  }

  async function removeEvent(id: string) {
    const target = [...events, ...assignmentEvents].find((e) => e.id === id)
    if (!target) return
    if (target.source === 'canvas') {
      if (target.htmlLink) window.open(target.htmlLink, '_blank', 'noreferrer')
      return
    }
    if (!window.confirm(`Delete "${target.title}" from your Google Calendar?`)) return
    setError(null)
    try {
      setEvents(await window.api.calendar.deleteEvent(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete event')
    }
  }

  const mergedEvents = [...events, ...assignmentEvents]

  if (connected === null) return null

  return (
    <div>
      {connected ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Add event</h3>
          <div className="form-grid">
            <div className="field">
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dentist appointment" />
            </div>
            <div className="field">
              <label>Start</label>
              <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="field">
              <label>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
            </div>
            <button className="btn btn-primary" onClick={addEvent} disabled={creating}>
              {creating ? 'Adding…' : 'Add event'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Connect Google Calendar</h3>
          <p className="muted" style={{ marginBottom: 12 }}>
            Canvas assignment due dates show below already. Connect your Google account in Settings to also sync
            and create real Google Calendar events here.
          </p>
          <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
            Go to Settings
          </button>
        </div>
      )}

      {connected && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted">Syncs 4 weeks back to 8 weeks ahead</span>
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
      )}

      {mergedEvents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            {connected ? 'No events synced yet — click "Sync calendar".' : 'No upcoming events or assignments yet.'}
          </div>
        </div>
      ) : (
        <WeekCalendar events={mergedEvents} onDelete={removeEvent} />
      )}
    </div>
  )
}
