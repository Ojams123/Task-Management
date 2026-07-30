import { useEffect, useState } from 'react'
import type { Reminder } from '../shared/types'

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000).toISOString()))
  const [recurrence, setRecurrence] = useState<Reminder['recurrence']>('none')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setReminders(await window.api.reminders.list())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleAdd() {
    if (!title.trim()) return
    await window.api.reminders.create({
      title: title.trim(),
      notes: null,
      dueAt: new Date(dueAt).toISOString(),
      recurrence,
    })
    setTitle('')
    setRecurrence('none')
    await refresh()
  }

  async function toggleComplete(r: Reminder) {
    await window.api.reminders.update(r.id, { completed: !r.completed })
    await refresh()
  }

  async function remove(id: string) {
    await window.api.reminders.remove(id)
    await refresh()
  }

  const upcoming = reminders.filter((r) => !r.completed)
  const completed = reminders.filter((r) => r.completed)

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>New reminder</h3>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>What do you need to do?</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call the dentist" />
          </div>
          <div className="field">
            <label>Due</label>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="field">
            <label>Repeat</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Reminder['recurrence'])}>
              <option value="none">Doesn't repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            Add reminder
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Upcoming ({upcoming.length})</h3>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : upcoming.length === 0 ? (
          <div className="empty-state">Nothing on your list. Add a reminder above.</div>
        ) : (
          <div className="list">
            {upcoming.map((r) => (
              <div className="list-row" key={r.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{r.title}</div>
                  <div className="list-row-sub">
                    {new Date(r.dueAt).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {r.recurrence !== 'none' && ` · repeats ${r.recurrence}`}
                  </div>
                </div>
                <div className="list-row-actions">
                  <button className="btn btn-sm" onClick={() => toggleComplete(r)}>
                    Done
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div className="card">
          <h3>Completed ({completed.length})</h3>
          <div className="list">
            {completed.slice(0, 10).map((r) => (
              <div className="list-row" key={r.id}>
                <div className="list-row-main">
                  <div className="list-row-title" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                    {r.title}
                  </div>
                </div>
                <div className="list-row-actions">
                  <button className="btn btn-sm" onClick={() => toggleComplete(r)}>
                    Undo
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(r.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
