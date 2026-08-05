import { useEffect, useState } from 'react'
import type { CanvasAssignment } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { Glyph } from '../components/Glyph'

export function Assignments({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([])
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'upcoming' | 'missing' | 'all'>('upcoming')

  async function refresh() {
    const settings = await window.api.canvas.getSettings()
    setConfigured(!!settings)
    if (settings) {
      setAssignments(await window.api.canvas.listCached())
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function sync() {
    setSyncing(true)
    setError(null)
    try {
      const fresh = await window.api.canvas.sync()
      setAssignments(fresh)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function toggleCompleted(id: string, completed: boolean) {
    setAssignments(await window.api.canvas.setLocalCompletion(id, completed))
  }

  const now = Date.now()
  const filtered = assignments.filter((a) => {
    if (filter === 'all') return true
    if (filter === 'missing') return !a.submitted && !a.completedLocally && a.dueAt !== null && new Date(a.dueAt).getTime() < now
    return !a.submitted && !a.completedLocally
  })

  const byCourse = new Map<string, CanvasAssignment[]>()
  for (const a of filtered) {
    const list = byCourse.get(a.courseName)
    if (list) list.push(a)
    else byCourse.set(a.courseName, [a])
  }
  const courseGroups = Array.from(byCourse.entries()).sort(([a], [b]) => a.localeCompare(b))

  if (configured === false) {
    return (
      <div className="card">
        <h3>Connect Canvas</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Add your Canvas domain and access token in Settings to see your assignments here.
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
          <div className="tag-row">
            {(['upcoming', 'missing', 'all'] as const).map((f) => (
              <button
                key={f}
                className={`btn btn-sm${filter === f ? ' btn-primary' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={sync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync with Canvas'}
          </button>
        </div>
        {error && (
          <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>

      <div className="card">
        <h3>{filter === 'upcoming' ? 'Upcoming assignments' : filter === 'missing' ? 'Missing assignments' : 'All assignments'}</h3>
        {filtered.length === 0 ? (
          <div className="empty-state">
            {assignments.length === 0 ? 'No assignments synced yet — click "Sync with Canvas".' : 'Nothing here.'}
          </div>
        ) : (
          courseGroups.map(([courseName, courseAssignments]) => (
            <div key={courseName} style={{ marginBottom: 18 }}>
              <div
                className="muted"
                style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 8 }}
              >
                {courseName} <span style={{ fontWeight: 400 }}>({courseAssignments.length})</span>
              </div>
              <div className="list">
                {courseAssignments.map((a) => {
                  const overdue = !a.submitted && a.dueAt !== null && new Date(a.dueAt).getTime() < now
                  return (
                    <div className="fin-row" key={a.id}>
                      <input
                        type="checkbox"
                        checked={a.completedLocally}
                        onChange={(e) => toggleCompleted(a.id, e.target.checked)}
                        title="Mark done (tracked in DeviceHub only — doesn't submit to Canvas)"
                      />
                      <Glyph label={courseName} />
                      <div className="fin-row-main">
                        <div
                          className="fin-row-title"
                          style={a.completedLocally ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}
                        >
                          {a.name}
                        </div>
                        <div className="fin-row-sub">
                          {a.dueAt && `Due ${new Date(a.dueAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                          {a.pointsPossible != null && ` · ${a.pointsPossible} pts`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {a.completedLocally && <span className="badge success">Done</span>}
                        {a.submitted && <span className="badge success">Submitted</span>}
                        {overdue && !a.completedLocally && <span className="badge danger">Overdue</span>}
                        <a className="btn btn-sm" href={a.htmlUrl} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
