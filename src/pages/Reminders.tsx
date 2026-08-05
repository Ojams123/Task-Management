import { useEffect, useState } from 'react'
import type { Reminder } from '../shared/types'
import { Glyph } from '../components/Glyph'
import { Drawer } from '../components/Drawer'

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

  const [selected, setSelected] = useState<Reminder | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueAt, setEditDueAt] = useState('')
  const [editRecurrence, setEditRecurrence] = useState<Reminder['recurrence']>('none')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

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

  function openReminder(r: Reminder) {
    setSelected(r)
    setEditTitle(r.title)
    setEditDueAt(toLocalInputValue(r.dueAt))
    setEditRecurrence(r.recurrence)
    setEditNotes(r.notes ?? '')
  }

  async function saveReminder() {
    if (!selected || !editTitle.trim()) return
    setSaving(true)
    try {
      await window.api.reminders.update(selected.id, {
        title: editTitle.trim(),
        dueAt: new Date(editDueAt).toISOString(),
        recurrence: editRecurrence,
        notes: editNotes.trim() || null,
      })
      setSelected(null)
      await refresh()
    } finally {
      setSaving(false)
    }
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
              <div className="fin-row" key={r.id} onClick={() => openReminder(r)} style={{ cursor: 'pointer' }}>
                <Glyph label={r.title} />
                <div className="fin-row-main">
                  <div className="fin-row-title">{r.title}</div>
                  <div className="fin-row-sub">
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
                <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
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
              <div className="fin-row" key={r.id}>
                <Glyph label={r.title} />
                <div className="fin-row-main">
                  <div className="fin-row-title" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                    {r.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="Edit reminder">
        {selected && (
          <>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Title</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Due</label>
              <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Repeat</label>
              <select value={editRecurrence} onChange={(e) => setEditRecurrence(e.target.value as Reminder['recurrence'])}>
                <option value="none">Doesn't repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Notes</label>
              <textarea
                rows={4}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes…"
              />
            </div>
            <button className="btn btn-primary" onClick={saveReminder} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        )}
      </Drawer>
    </div>
  )
}
