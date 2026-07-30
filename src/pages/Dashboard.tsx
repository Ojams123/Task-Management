import { useEffect, useState } from 'react'
import type { Page } from '../components/Sidebar'
import type { CanvasAssignment, Goal, NotificationDigest, Reminder } from '../shared/types'

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [budgetSummary, setBudgetSummary] = useState<{ income: number; expenses: number; balance: number } | null>(
    null
  )
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([])
  const [canvasConfigured, setCanvasConfigured] = useState(false)
  const [digest, setDigest] = useState<NotificationDigest | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)

  useEffect(() => {
    async function load() {
      const [r, g, b, canvasSettings, googleStatus] = await Promise.all([
        window.api.reminders.list(),
        window.api.goals.list(),
        window.api.budget.summary(),
        window.api.canvas.getSettings(),
        window.api.notifications.getGoogleAuthStatus(),
      ])
      setReminders(r)
      setGoals(g)
      setBudgetSummary(b)
      setCanvasConfigured(!!canvasSettings)
      setGoogleConnected(googleStatus.connected)

      if (canvasSettings) setAssignments(await window.api.canvas.listCached())
      if (googleStatus.connected) setDigest(await window.api.notifications.getDigest())
    }
    load()
  }, [])

  const upcomingReminders = reminders.filter((r) => !r.completed).slice(0, 5)
  const activeGoals = goals.filter((g) => !g.archived).slice(0, 4)
  const upcomingAssignments = assignments.filter((a) => !a.submitted).slice(0, 5)

  return (
    <div className="grid grid-2">
      <div className="card">
        <h3>
          Today's reminders
          <button className="link" onClick={() => onNavigate('reminders')}>
            View all
          </button>
        </h3>
        {upcomingReminders.length === 0 ? (
          <div className="empty-state">Nothing due. Add one from Reminders or say "remind me to…".</div>
        ) : (
          <div className="list">
            {upcomingReminders.map((r) => (
              <div className="list-row" key={r.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{r.title}</div>
                  <div className="list-row-sub">
                    {new Date(r.dueAt).toLocaleString(undefined, {
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>
          Goal progress
          <button className="link" onClick={() => onNavigate('goals')}>
            View all
          </button>
        </h3>
        {activeGoals.length === 0 ? (
          <div className="empty-state">No active goals yet.</div>
        ) : (
          <div className="list">
            {activeGoals.map((g) => {
              const pct = g.targetValue > 0 ? Math.min(100, (g.currentValue / g.targetValue) * 100) : 0
              return (
                <div key={g.id} style={{ padding: '4px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{g.title}</span>
                    <span className="muted">
                      {g.currentValue}/{g.targetValue} {g.unit}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3>
          Budget snapshot
          <button className="link" onClick={() => onNavigate('budget')}>
            View all
          </button>
        </h3>
        {budgetSummary ? (
          <div className="grid grid-3">
            <div className="stat">
              <span className="stat-label">Income</span>
              <span className="stat-value" style={{ fontSize: 18, color: 'var(--success)' }}>
                {formatMoney(budgetSummary.income)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Expenses</span>
              <span className="stat-value" style={{ fontSize: 18, color: 'var(--danger)' }}>
                {formatMoney(budgetSummary.expenses)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Balance</span>
              <span className="stat-value" style={{ fontSize: 18 }}>
                {formatMoney(budgetSummary.balance)}
              </span>
            </div>
          </div>
        ) : (
          <div className="empty-state">No budget data yet.</div>
        )}
      </div>

      <div className="card">
        <h3>
          Assignments due
          <button className="link" onClick={() => onNavigate('assignments')}>
            View all
          </button>
        </h3>
        {!canvasConfigured ? (
          <div className="empty-state">
            Connect Canvas in Settings to see assignments here.
          </div>
        ) : upcomingAssignments.length === 0 ? (
          <div className="empty-state">Nothing outstanding — sync from Assignments to check for updates.</div>
        ) : (
          <div className="list">
            {upcomingAssignments.map((a) => (
              <div className="list-row" key={a.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{a.name}</div>
                  <div className="list-row-sub">
                    {a.courseName}
                    {a.dueAt && ` · due ${new Date(a.dueAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ gridColumn: 'span 2' }}>
        <h3>
          Missed notifications
          <button className="link" onClick={() => onNavigate('notifications')}>
            View all
          </button>
        </h3>
        {!googleConnected ? (
          <div className="empty-state">Connect Gmail in Settings to get a summary of what you missed.</div>
        ) : digest && digest.items.length > 0 ? (
          <p className="muted">
            {digest.totalUnread} unread since {new Date(digest.sinceLastCheck).toLocaleString()} — including
            messages from {digest.items.slice(0, 3).map((i) => i.from.split('<')[0].trim()).join(', ')}
            {digest.items.length > 3 ? ' and others' : ''}.
          </p>
        ) : (
          <div className="empty-state">You're all caught up.</div>
        )}
      </div>
    </div>
  )
}
