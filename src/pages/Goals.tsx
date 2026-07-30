import { useEffect, useState } from 'react'
import type { Goal } from '../shared/types'

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [targetValue, setTargetValue] = useState(10)
  const [unit, setUnit] = useState('sessions')
  const [logInputs, setLogInputs] = useState<Record<string, string>>({})

  async function refresh() {
    setGoals(await window.api.goals.list())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleAdd() {
    if (!title.trim()) return
    await window.api.goals.create({
      title: title.trim(),
      description: null,
      category: category.trim() || 'general',
      targetValue,
      unit: unit.trim() || 'units',
      dueDate: null,
    })
    setTitle('')
    setTargetValue(10)
    await refresh()
  }

  async function logProgress(goal: Goal, delta: number) {
    if (!delta) return
    await window.api.goals.logProgress(goal.id, delta)
    await refresh()
  }

  async function archive(goal: Goal) {
    await window.api.goals.update(goal.id, { archived: !goal.archived })
    await refresh()
  }

  async function remove(id: string) {
    await window.api.goals.remove(id)
    await refresh()
  }

  const active = goals.filter((g) => !g.archived)
  const archived = goals.filter((g) => g.archived)

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>New goal</h3>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>Goal</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Read 12 books this year" />
          </div>
          <div className="field">
            <label>Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="health, career…" />
          </div>
          <div className="field">
            <label>Target</label>
            <input
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Unit</label>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="books, miles, $…" />
          </div>
          <button className="btn btn-primary" onClick={handleAdd}>
            Add goal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : active.length === 0 ? (
        <div className="empty-state">No active goals yet. Add one above to start tracking progress.</div>
      ) : (
        <div className="grid grid-2">
          {active.map((goal) => {
            const pct = goal.targetValue > 0 ? Math.min(100, (goal.currentValue / goal.targetValue) * 100) : 0
            return (
              <div className="card" key={goal.id}>
                <h3>
                  {goal.title}
                  <button className="link" onClick={() => archive(goal)}>
                    Archive
                  </button>
                </h3>
                <div className="muted" style={{ marginBottom: 8 }}>
                  {goal.category} · {goal.currentValue} / {goal.targetValue} {goal.unit}
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="inline-form" style={{ marginTop: 12 }}>
                  <input
                    type="number"
                    placeholder="Amount"
                    style={{ width: 90 }}
                    className="btn-sm"
                    value={logInputs[goal.id] ?? ''}
                    onChange={(e) => setLogInputs({ ...logInputs, [goal.id]: e.target.value })}
                  />
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      logProgress(goal, Number(logInputs[goal.id] ?? 0))
                      setLogInputs({ ...logInputs, [goal.id]: '' })
                    }}
                  >
                    Log progress
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(goal.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3>Archived ({archived.length})</h3>
          <div className="list">
            {archived.map((goal) => (
              <div className="list-row" key={goal.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{goal.title}</div>
                  <div className="list-row-sub">
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </div>
                </div>
                <div className="list-row-actions">
                  <button className="btn btn-sm" onClick={() => archive(goal)}>
                    Restore
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => remove(goal.id)}>
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
