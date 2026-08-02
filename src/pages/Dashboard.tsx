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
import { BellIcon, OuraIcon, TargetIcon, WalletIcon } from '../components/icons'
import { AssistantAvatar } from '../components/AssistantAvatar'
import { speak } from '../voice/speak'

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function BudgetGauge({ pct }: { pct: number | null }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - (pct ?? 0) / 100)
  return (
    <div className="dv2-gauge">
      <svg viewBox="0 0 120 120" width={140} height={140}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
        {pct != null && (
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
          />
        )}
      </svg>
      <div className="dv2-gauge-value">{pct != null ? `${pct}%` : '—'}</div>
    </div>
  )
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

  const [assistantConfigured, setAssistantConfigured] = useState(false)
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantExchange, setAssistantExchange] = useState<{ question: string; reply: string } | null>(null)
  const [assistantSending, setAssistantSending] = useState(false)
  const [assistantError, setAssistantError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [profileName, r, g, b, canvasSettings, googleStatus, fitnessSummary, ouraStatus, assistantStatus] =
        await Promise.all([
          window.api.profile.getName(),
          window.api.reminders.list(),
          window.api.goals.list(),
          window.api.budget.summary(),
          window.api.canvas.getSettings(),
          window.api.notifications.getGoogleAuthStatus(),
          window.api.fitness.dailySummary(),
          window.api.oura.getStatus(),
          window.api.assistant.getStatus(),
        ])
      setName(profileName ?? '')
      setReminders(r)
      setGoals(g)
      setBudgetSummary(b)
      setCanvasConfigured(!!canvasSettings)
      setGoogleConnected(googleStatus.connected)
      setFitness(fitnessSummary)
      setOuraConfigured(ouraStatus.configured)
      setAssistantConfigured(assistantStatus.configured)

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

  async function askAssistant() {
    const question = assistantInput.trim()
    if (!question || assistantSending) return
    setAssistantSending(true)
    setAssistantError(null)
    setAssistantInput('')
    try {
      const history = await window.api.assistant.sendMessage(question)
      const reply = history[history.length - 1]
      if (reply && reply.role === 'assistant') {
        setAssistantExchange({ question, reply: reply.content })
        speak(reply.content)
      }
    } catch (e) {
      setAssistantError(e instanceof Error ? e.message : 'Failed to reach the assistant')
    } finally {
      setAssistantSending(false)
    }
  }

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

  const totalPriorities =
    dueTodayOrOverdue + (canvasConfigured ? assignmentsDueSoon : 0) + (googleConnected ? eventsToday : 0)
  const incomePct =
    budgetSummary && budgetSummary.income > 0
      ? Math.min(100, Math.round((budgetSummary.expenses / budgetSummary.income) * 100))
      : null

  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="dv2-root">
      <div className="dv2-hero">
        <div>
          <h1 className="greeting-title">
            {greetingForHour(now.getHours())}
            {name.trim() ? `, ${name.trim()}` : ''}
          </h1>
          <p className="greeting-subtitle">{dateLabel}</p>
        </div>
        <div className="dv2-pill">
          <span aria-hidden>⚡</span>
          {totalPriorities > 0
            ? `${totalPriorities} thing${totalPriorities === 1 ? '' : 's'} need${totalPriorities === 1 ? 's' : ''} attention`
            : 'All caught up'}
        </div>
      </div>

      <div className="dv2-stat-row">
        <button className="dv2-stat-tile dv2-pastel-1" onClick={() => onNavigate('reminders')}>
          <span className="dv2-stat-tile-top">Reminders</span>
          <div className="dv2-stat-tile-bottom">
            <span className="dv2-stat-tile-value">{upcomingReminders.length}</span>
            <span className="dv2-stat-tile-icon dv2-pastel-1-icon">
              <BellIcon size={16} />
            </span>
          </div>
        </button>
        <button className="dv2-stat-tile dv2-pastel-2" onClick={() => onNavigate('goals')}>
          <span className="dv2-stat-tile-top">Active goals</span>
          <div className="dv2-stat-tile-bottom">
            <span className="dv2-stat-tile-value">{activeGoals.length}</span>
            <span className="dv2-stat-tile-icon dv2-pastel-2-icon">
              <TargetIcon size={16} />
            </span>
          </div>
        </button>
        <button className="dv2-stat-tile dv2-pastel-3" onClick={() => onNavigate('budget')}>
          <span className="dv2-stat-tile-top">Balance this month</span>
          <div className="dv2-stat-tile-bottom">
            <span className="dv2-stat-tile-value">{budgetSummary ? formatMoney(budgetSummary.balance) : '—'}</span>
            <span className="dv2-stat-tile-icon dv2-pastel-3-icon">
              <WalletIcon size={16} />
            </span>
          </div>
        </button>
      </div>

      <div className="grid grid-2">
      <div className="card dv2-gauge-card">
        <h3>Income spent this month</h3>
        <BudgetGauge pct={incomePct} />
        <p className="muted" style={{ marginTop: 8 }}>
          {budgetSummary
            ? `${formatMoney(budgetSummary.expenses)} of ${formatMoney(budgetSummary.income)}`
            : 'No budget data yet.'}
        </p>
      </div>

      <div className="card" style={{ gridColumn: 'span 2' }}>
        <h3>
          Assistant
          <button className="link" onClick={() => onNavigate('assistant')}>
            Open
          </button>
        </h3>
        {!assistantConfigured ? (
          <div className="empty-state">
            Add your Anthropic or OpenAI API key in Settings to enable the built-in assistant.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AssistantAvatar size={64} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {assistantExchange ? (
                <div style={{ marginBottom: 10 }}>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 2 }}>
                    You asked: "{assistantExchange.question}"
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{assistantExchange.reply}</div>
                </div>
              ) : (
                <div className="empty-state" style={{ marginBottom: 10 }}>
                  Ask it anything — "what's due this week?", "log a run", "add a reminder".
                </div>
              )}
              {assistantError && (
                <p className="muted" style={{ color: 'var(--danger)', marginBottom: 8 }}>
                  {assistantError}
                </p>
              )}
              <div className="inline-form">
                <input
                  style={{ flex: 1 }}
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && askAssistant()}
                  placeholder="Ask the assistant…"
                />
                <button className="btn btn-primary" onClick={askAssistant} disabled={assistantSending}>
                  {assistantSending ? 'Asking…' : 'Ask'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
    </div>
  )
}
