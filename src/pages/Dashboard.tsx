import { useEffect, useState } from 'react'
import type { Page } from '../components/Sidebar'
import type {
  CalendarEvent,
  CanvasAssignment,
  DailyFitnessSummary,
  Goal,
  NotificationDigest,
  OuraDailySummary,
  Reminder,
} from '../shared/types'
import { OuraIcon } from '../components/icons'

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function greetingForHour(hour: number): string {
  if (hour < 5) return 'Working late'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good evening'
}

export function Dashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [name, setName] = useState('')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [budgetSummary, setBudgetSummary] = useState<{ income: number; expenses: number; balance: number } | null>(
    null
  )
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([])
  const [canvasConfigured, setCanvasConfigured] = useState(false)
  const [digest, setDigest] = useState<NotificationDigest | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [fitness, setFitness] = useState<DailyFitnessSummary | null>(null)
  const [ouraConfigured, setOuraConfigured] = useState(false)
  const [ouraToday, setOuraToday] = useState<OuraDailySummary | null>(null)

  useEffect(() => {
    async function load() {
      const [profileName, r, g, b, canvasSettings, googleStatus, fitnessSummary, ouraStatus] = await Promise.all([
        window.api.profile.getName(),
        window.api.reminders.list(),
        window.api.goals.list(),
        window.api.budget.summary(),
        window.api.canvas.getSettings(),
        window.api.notifications.getGoogleAuthStatus(),
        window.api.fitness.dailySummary(),
        window.api.oura.getStatus(),
      ])
      setName(profileName ?? '')
      setReminders(r)
      setGoals(g)
      setBudgetSummary(b)
      setCanvasConfigured(!!canvasSettings)
      setGoogleConnected(googleStatus.connected)
      setFitness(fitnessSummary)
      setOuraConfigured(ouraStatus.configured)

      if (canvasSettings) setAssignments(await window.api.canvas.listCached())
      if (googleStatus.connected) {
        setDigest(await window.api.notifications.getDigest())
        setEvents(await window.api.calendar.getEvents())
      }
      if (ouraStatus.configured) {
        const days = await window.api.oura.listCached()
        setOuraToday(days[0] ?? null)
      }
    }
    load()
  }, [])

  const now = new Date()
  const upcomingReminders = reminders.filter((r) => !r.completed).slice(0, 5)
  const activeGoals = goals.filter((g) => !g.archived).slice(0, 4)
  const upcomingAssignments = assignments.filter((a) => !a.submitted).slice(0, 5)
  const upcomingEvents = events.slice(0, 4)

  const dueTodayOrOverdue = reminders.filter((r) => !r.completed && new Date(r.dueAt) <= new Date(now.getTime() + 24 * 60 * 60 * 1000)).length
  const assignmentsDueSoon = assignments.filter(
    (a) => !a.submitted && a.dueAt && new Date(a.dueAt) <= new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  ).length
  const eventsToday = events.filter((e) => isSameDay(new Date(e.start), now)).length

  const priorityChips: { label: string; hue: string }[] = []
  if (dueTodayOrOverdue > 0) {
    priorityChips.push({ label: `${dueTodayOrOverdue} reminder${dueTodayOrOverdue === 1 ? '' : 's'} due`, hue: 'var(--hue-1)' })
  }
  if (canvasConfigured && assignmentsDueSoon > 0) {
    priorityChips.push({ label: `${assignmentsDueSoon} assignment${assignmentsDueSoon === 1 ? '' : 's'} due soon`, hue: 'var(--hue-6)' })
  }
  if (googleConnected && eventsToday > 0) {
    priorityChips.push({ label: `${eventsToday} event${eventsToday === 1 ? '' : 's'} today`, hue: 'var(--hue-2)' })
  }
  if (budgetSummary) {
    priorityChips.push({ label: `${formatMoney(budgetSummary.balance)} left this month`, hue: 'var(--hue-3)' })
  }

  const initial = name.trim() ? name.trim()[0].toUpperCase() : 'D'
  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <>
      <div className="greeting-hero">
        <div className="greeting-hero-top">
          <div className="avatar-circle">{initial}</div>
          <div>
            <h1 className="greeting-title">
              {greetingForHour(now.getHours())}
              {name.trim() ? `, ${name.trim()}` : ''}
            </h1>
            <p className="greeting-subtitle">{dateLabel}</p>
          </div>
        </div>
        {priorityChips.length > 0 ? (
          <div className="priority-chips">
            {priorityChips.map((chip) => (
              <span key={chip.label} className="priority-chip" style={{ ['--chip-hue' as string]: chip.hue }}>
                {chip.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="greeting-subtitle">Nothing urgent — enjoy the calm.</p>
        )}
      </div>

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

      <div className="card">
        <h3>
          Upcoming events
          <button className="link" onClick={() => onNavigate('calendar')}>
            View all
          </button>
        </h3>
        {!googleConnected ? (
          <div className="empty-state">Connect Google in Settings to see calendar events here.</div>
        ) : upcomingEvents.length === 0 ? (
          <div className="empty-state">Nothing synced — sync from Calendar to check for updates.</div>
        ) : (
          <div className="list">
            {upcomingEvents.map((e) => (
              <div className="list-row" key={e.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{e.title}</div>
                  <div className="list-row-sub">
                    {e.allDay
                      ? new Date(e.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : new Date(e.start).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>
          Fitness today
          <button className="link" onClick={() => onNavigate('fitness')}>
            View all
          </button>
        </h3>
        {fitness ? (
          <div className="grid grid-3">
            <div className="stat">
              <span className="stat-label">Consumed</span>
              <span className="stat-value" style={{ fontSize: 18 }}>
                {fitness.consumed}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Burned</span>
              <span className="stat-value" style={{ fontSize: 18, color: 'var(--success)' }}>
                {fitness.burned}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Net / target</span>
              <span
                className="stat-value"
                style={{ fontSize: 18, color: fitness.net > fitness.target ? 'var(--danger)' : undefined }}
              >
                {fitness.net}/{fitness.target}
              </span>
            </div>
          </div>
        ) : (
          <div className="empty-state">No fitness data yet.</div>
        )}
      </div>

      <div className="card">
        <h3>
          <span className="heading-with-icon">
            <OuraIcon size={18} />
            Oura
          </span>
          <button className="link" onClick={() => onNavigate('fitness')}>
            View all
          </button>
        </h3>
        {!ouraConfigured ? (
          <div className="empty-state">Connect Oura in Settings to see sleep and readiness scores here.</div>
        ) : !ouraToday ? (
          <div className="empty-state">No data synced yet — sync from Fitness to check for updates.</div>
        ) : (
          <div className="grid grid-2">
            <div className="stat">
              <span className="stat-label">Sleep</span>
              <span className="stat-value" style={{ fontSize: 18 }}>
                {ouraToday.sleepScore ?? '—'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Readiness</span>
              <span className="stat-value" style={{ fontSize: 18 }}>
                {ouraToday.readinessScore ?? '—'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Activity</span>
              <span className="stat-value" style={{ fontSize: 18 }}>
                {ouraToday.activityScore ?? '—'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Steps</span>
              <span className="stat-value" style={{ fontSize: 18 }}>
                {ouraToday.steps?.toLocaleString() ?? '—'}
              </span>
            </div>
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
    </>
  )
}
