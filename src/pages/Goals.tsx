import { useEffect, useState } from 'react'
import { GOAL_CATEGORIES, type Goal, type GoalLogEntry } from '../shared/types'
import { Glyph } from '../components/Glyph'
import { Drawer } from '../components/Drawer'

export function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('general')
  const [targetValue, setTargetValue] = useState(10)
  const [unit, setUnit] = useState('sessions')
  const [logInputs, setLogInputs] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<string>('all')

  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null)
  const [history, setHistory] = useState<GoalLogEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

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

  async function openHistory(goal: Goal) {
    setHistoryGoal(goal)
    setHistoryLoading(true)
    try {
      setHistory(await window.api.goals.history(goal.id))
    } finally {
      setHistoryLoading(false)
    }
  }

  const active = goals.filter((g) => !g.archived && (filter === 'all' || g.category.toLowerCase() === filter))
  const archived = goals.filter((g) => g.archived)
  const allActive = goals.filter((g) => !g.archived)
  const avgPct =
    allActive.length > 0
      ? Math.round(
          allActive.reduce((sum, g) => sum + (g.targetValue > 0 ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0), 0) /
            allActive.length
        )
      : 0

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
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="fitness, work, personal…"
              list="goal-categories"
            />
            <datalist id="goal-categories">
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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

      <div className="grid-editorial" style={{ marginBottom: 20 }}>
        <div className="card hero-card span-3">
          <div className="hero-label">Active goals</div>
          <div className="hero-value">{allActive.length}</div>
          <p className="muted" style={{ marginTop: 8 }}>
            {allActive.length > 0 ? `${avgPct}% average progress` : 'Add a goal below to start tracking'}
          </p>
        </div>
        <div className="card span-1">
          <div className="stat">
            <span className="stat-label">Archived</span>
            <span className="hero-value" style={{ fontSize: 34 }}>
              {archived.length}
            </span>
          </div>
        </div>
      </div>

      <div className="tag-row" style={{ marginBottom: 16 }}>
        {['all', ...GOAL_CATEGORIES].map((c) => (
          <button
            key={c}
            className={`btn btn-sm${filter === c ? ' btn-primary' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
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
                  <span className="heading-with-icon">
                    <Glyph label={goal.title} size={26} />
                    {goal.title}
                  </span>
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
                  <button className="btn btn-sm" onClick={() => openHistory(goal)}>
                    History
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
              <div className="fin-row" key={goal.id}>
                <Glyph label={goal.title} />
                <div className="fin-row-main">
                  <div className="fin-row-title">{goal.title}</div>
                  <div className="fin-row-sub">
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
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

      <Drawer open={!!historyGoal} onClose={() => setHistoryGoal(null)} title={historyGoal ? `${historyGoal.title} history` : ''}>
        {historyLoading ? (
          <div className="empty-state">Loading…</div>
        ) : history.length === 0 ? (
          <div className="empty-state">No progress logged yet.</div>
        ) : (
          <div className="list">
            {history.map((entry) => (
              <div className="fin-row" key={entry.id}>
                <div className="fin-row-main">
                  <div className="fin-row-title">
                    {entry.delta > 0 ? '+' : ''}
                    {entry.delta} {historyGoal?.unit}
                  </div>
                  <div className="fin-row-sub">
                    {new Date(entry.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    {entry.note && ` · ${entry.note}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  )
}
