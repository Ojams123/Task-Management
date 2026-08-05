import { useEffect, useState } from 'react'
import type { Page } from '../components/Sidebar'
import type {
  BudgetCategory,
  CalendarEvent,
  CanvasAssignment,
  DailyFitnessSummary,
  Goal,
  NotificationDigest,
  OuraDailySummary,
  Reminder,
  SimplefinAccount,
  Transaction,
} from '../shared/types'
import { BellIcon, OuraIcon, TargetIcon, WalletIcon } from '../components/icons'
import { AssistantAvatar } from '../components/AssistantAvatar'
import { WeekCalendar } from '../components/WeekCalendar'
import { Sparkline } from '../components/Sparkline'
import { Glyph } from '../components/Glyph'
import { speak, startVoiceWarmup, stopVoiceWarmup } from '../voice/speak'

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

// A single-hue dark-to-light tint ramp (not a rainbow of distinct hues) —
// category identity comes from the legend's labels, not the color alone.
const BREAKDOWN_HUES = [
  'var(--dv2-tint-1)',
  'var(--dv2-tint-2)',
  'var(--dv2-tint-3)',
  'var(--dv2-tint-4)',
  'var(--dv2-tint-5)',
  'var(--dv2-tint-6)',
]

function relativeDayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Today'
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (isSameDay(date, tomorrow)) return 'Tomorrow'
  if (date < now) return 'Overdue'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
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
  const [budgetSummary, setBudgetSummary] = useState<{
    income: number
    expenses: number
    balance: number
    byCategory: { categoryId: string; name: string; spent: number; limit: number }[]
  } | null>(null)
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [assignments, setAssignments] = useState<CanvasAssignment[]>([])
  const [canvasConfigured, setCanvasConfigured] = useState(false)
  const [digest, setDigest] = useState<NotificationDigest | null>(null)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [fitness, setFitness] = useState<DailyFitnessSummary | null>(null)
  const [ouraConfigured, setOuraConfigured] = useState(false)
  const [ouraToday, setOuraToday] = useState<OuraDailySummary | null>(null)
  const [simplefinConfigured, setSimplefinConfigured] = useState(false)
  const [simplefinAccounts, setSimplefinAccounts] = useState<SimplefinAccount[]>([])

  const [assistantConfigured, setAssistantConfigured] = useState(false)
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantExchange, setAssistantExchange] = useState<{ question: string; reply: string } | null>(null)
  const [assistantSending, setAssistantSending] = useState(false)
  const [assistantError, setAssistantError] = useState<string | null>(null)

  const [activityFilter, setActivityFilter] = useState<'all' | 'reminder' | 'assignment' | 'event'>('all')
  const [weekCalError, setWeekCalError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [
        profileName,
        r,
        g,
        b,
        cats,
        txs,
        canvasSettings,
        googleStatus,
        fitnessSummary,
        ouraStatus,
        assistantStatus,
        simplefinStatus,
      ] = await Promise.all([
        window.api.profile.getName(),
        window.api.reminders.list(),
        window.api.goals.list(),
        window.api.budget.summary(),
        window.api.budget.listCategories(),
        window.api.budget.listTransactions(),
        window.api.canvas.getSettings(),
        window.api.notifications.getGoogleAuthStatus(),
        window.api.fitness.dailySummary(),
        window.api.oura.getStatus(),
        window.api.assistant.getStatus(),
        window.api.simplefin.getStatus(),
      ])
      setName(profileName ?? '')
      setReminders(r)
      setGoals(g)
      setBudgetSummary(b)
      setCategories(cats)
      setTransactions(txs)
      setCanvasConfigured(!!canvasSettings)
      setGoogleConnected(googleStatus.connected)
      setFitness(fitnessSummary)
      setOuraConfigured(ouraStatus.configured)
      setAssistantConfigured(assistantStatus.configured)
      setSimplefinConfigured(simplefinStatus.configured)

      // Each of these is independent of the others — run them concurrently
      // and isolate failures with .catch() so one integration erroring out
      // (an expired Google token, a flaky SimpleFIN sync, etc.) can't cascade
      // and silently block the rest from loading. A prior sequential-await
      // version meant a single failure here left everything after it in the
      // chain permanently unfetched for the rest of the session.
      const followUps: Promise<void>[] = []
      if (canvasSettings) {
        followUps.push(window.api.canvas.listCached().then(setAssignments).catch(() => {}))
      }
      if (googleStatus.connected) {
        followUps.push(window.api.notifications.getDigest().then(setDigest).catch(() => {}))
        followUps.push(window.api.calendar.getEvents().then(setEvents).catch(() => {}))
      }
      if (ouraStatus.configured) {
        followUps.push(
          window.api.oura
            .listCached()
            .then((days) => setOuraToday(days[0] ?? null))
            .catch(() => {})
        )
      }
      if (simplefinStatus.configured) {
        followUps.push(window.api.simplefin.listAccounts().then(setSimplefinAccounts).catch(() => {}))
      }
      await Promise.allSettled(followUps)
    }
    load()
  }, [])

  async function askAssistant() {
    const question = assistantInput.trim()
    if (!question || assistantSending) return
    startVoiceWarmup()
    setAssistantSending(true)
    setAssistantError(null)
    setAssistantInput('')
    try {
      const history = await window.api.assistant.sendMessage(question)
      const reply = history[history.length - 1]
      if (reply && reply.role === 'assistant') {
        setAssistantExchange({ question, reply: reply.content })
        speak(reply.content)
      } else {
        stopVoiceWarmup()
      }
    } catch (e) {
      setAssistantError(e instanceof Error ? e.message : 'Failed to reach the assistant')
      stopVoiceWarmup()
    } finally {
      setAssistantSending(false)
    }
  }

  async function toggleReminderComplete(r: Reminder) {
    await window.api.reminders.update(r.id, { completed: !r.completed })
    setReminders(await window.api.reminders.list())
  }

  async function removeWeekEvent(id: string) {
    const target = weekEvents.find((e) => e.id === id)
    if (!target) return
    if (target.source === 'canvas') {
      if (target.htmlLink) window.open(target.htmlLink, '_blank', 'noreferrer')
      return
    }
    if (target.source === 'reminder') {
      onNavigate('reminders')
      return
    }
    if (!window.confirm(`Delete "${target.title}" from your Google Calendar?`)) return
    setWeekCalError(null)
    try {
      setEvents(await window.api.calendar.deleteEvent(id))
    } catch (e) {
      setWeekCalError(e instanceof Error ? e.message : 'Could not delete event')
    }
  }

  const now = new Date()
  const upcomingReminders = reminders.filter((r) => !r.completed).slice(0, 5)
  const activeGoals = goals.filter((g) => !g.archived).slice(0, 4)

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

  type ActivityItem = { id: string; type: 'reminder' | 'assignment' | 'event'; title: string; subtitle: string; date: Date }
  const activityItems: ActivityItem[] = [
    ...reminders
      .filter((r) => !r.completed)
      .map((r): ActivityItem => ({ id: `r-${r.id}`, type: 'reminder', title: r.title, subtitle: 'Reminder', date: new Date(r.dueAt) })),
    ...(canvasConfigured
      ? assignments
          .filter((a) => !a.submitted && a.dueAt)
          .map((a): ActivityItem => ({ id: `a-${a.id}`, type: 'assignment', title: a.name, subtitle: a.courseName, date: new Date(a.dueAt as string) }))
      : []),
    ...(googleConnected
      ? events.map((e): ActivityItem => ({ id: `e-${e.id}`, type: 'event', title: e.title, subtitle: e.location ?? 'Event', date: new Date(e.start) }))
      : []),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())
  const filteredActivity = activityItems.filter((i) => activityFilter === 'all' || i.type === activityFilter).slice(0, 8)

  const weekEvents: CalendarEvent[] = [
    ...events,
    ...(canvasConfigured
      ? assignments
          .filter((a) => !a.submitted && a.dueAt)
          .map(
            (a): CalendarEvent => ({
              id: `canvas-${a.id}`,
              title: a.name,
              start: a.dueAt as string,
              end: null,
              allDay: false,
              location: a.courseName,
              htmlLink: a.htmlUrl,
              source: 'canvas',
            })
          )
      : []),
    ...reminders
      .filter((r) => !r.completed)
      .map(
        (r): CalendarEvent => ({
          id: `reminder-${r.id}`,
          title: r.title,
          start: r.dueAt,
          end: null,
          allDay: false,
          location: null,
          htmlLink: null,
          source: 'reminder',
        })
      ),
  ]

  const todayScheduleItems = weekEvents
    .filter((e) => isSameDay(new Date(e.start), now))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  const kindByCategoryId = new Map(categories.map((c) => [c.id, c.kind]))
  const expenseRows = budgetSummary
    ? budgetSummary.byCategory
        .filter((c) => kindByCategoryId.get(c.categoryId) === 'expense' && c.spent > 0)
        .sort((a, b) => b.spent - a.spent)
    : []
  const expenseTotal = expenseRows.reduce((sum, r) => sum + r.spent, 0)
  const expenseBreakdown = expenseRows.map((r, i) => ({
    ...r,
    color: BREAKDOWN_HUES[i % BREAKDOWN_HUES.length],
    pct: expenseTotal > 0 ? (r.spent / expenseTotal) * 100 : 0,
  }))

  const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  const balancePoints = (() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    )
    let running = 0
    const points = sorted.map((t) => {
      const kind = kindByCategoryId.get(t.categoryId)
      running += kind === 'income' ? t.amount : -t.amount
      return {
        label: new Date(t.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: running,
      }
    })
    return points.length > 0 ? [{ label: 'Start of month', value: 0 }, ...points] : points
  })()

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

      <div className="dv2-action-row">
        <button className="dv2-action-pill" onClick={() => onNavigate('reminders')}>
          <span className="dv2-action-pill-icon" aria-hidden="true">
            +
          </span>
          Add reminder
        </button>
        <button className="dv2-action-pill" onClick={() => onNavigate('goals')}>
          <span className="dv2-action-pill-icon" aria-hidden="true">
            ◎
          </span>
          New goal
        </button>
        <button className="dv2-action-pill" onClick={() => onNavigate('budget')}>
          <span className="dv2-action-pill-icon" aria-hidden="true">
            +
          </span>
          Log expense
        </button>
        <button className="dv2-action-pill" onClick={() => onNavigate('assistant')}>
          <span className="dv2-action-pill-icon" aria-hidden="true">
            ✦
          </span>
          Ask AI
        </button>
      </div>

      <div className="dv2-stat-row">
        <button className="dv2-stat-tile dv2-pastel-1" onClick={() => onNavigate('reminders')}>
          <div>
            <span className="dv2-stat-tile-top">Reminders</span>
            <div className="dv2-stat-tile-caption">Stay on top of tasks.</div>
          </div>
          <div className="dv2-stat-tile-bottom">
            <span className="dv2-stat-tile-value">{upcomingReminders.length}</span>
            <span className="dv2-stat-tile-icon dv2-pastel-1-icon">
              <BellIcon size={16} />
            </span>
          </div>
        </button>
        <button className="dv2-stat-tile dv2-pastel-2" onClick={() => onNavigate('goals')}>
          <div>
            <span className="dv2-stat-tile-top">Active goals</span>
            <div className="dv2-stat-tile-caption">Track your progress.</div>
          </div>
          <div className="dv2-stat-tile-bottom">
            <span className="dv2-stat-tile-value">{activeGoals.length}</span>
            <span className="dv2-stat-tile-icon dv2-pastel-2-icon">
              <TargetIcon size={16} />
            </span>
          </div>
        </button>
        <button className="dv2-stat-tile dv2-pastel-3" onClick={() => onNavigate('budget')}>
          <div>
            <span className="dv2-stat-tile-top">Balance this month</span>
            <div className="dv2-stat-tile-caption">Income minus expenses.</div>
          </div>
          <div className="dv2-stat-tile-bottom">
            <span className="dv2-stat-tile-value">{budgetSummary ? formatMoney(budgetSummary.balance) : '—'}</span>
            <span className="dv2-stat-tile-icon dv2-pastel-3-icon">
              <WalletIcon size={16} />
            </span>
          </div>
        </button>
      </div>

      <div className="grid-editorial">
      <div className="card hero-card span-3">
        <h3>
          <span className="heading-with-icon">
            <WalletIcon size={16} />
            Finance pulse
          </span>
          <button className="link" onClick={() => onNavigate('budget')}>
            Open Budget
          </button>
        </h3>
        <div className="finance-pulse-top">
          <span className="finance-pulse-value">
            {budgetSummary ? formatMoney(budgetSummary.balance) : '—'}
          </span>
          {budgetSummary && (
            <div className="finance-pulse-deltas">
              <span className="finance-pulse-pill up">↑ {formatMoney(budgetSummary.income)}</span>
              <span className="finance-pulse-pill down">↓ {formatMoney(budgetSummary.expenses)}</span>
            </div>
          )}
        </div>
        <Sparkline
          points={balancePoints}
          color="var(--accent)"
          formatValue={(v) => formatMoney(v)}
        />
        <p className="finance-pulse-caption">
          {incomePct != null ? `${incomePct}% of income spent this month` : 'No budget data yet'}
        </p>
      </div>

      <div className="card span-1">
        <h3>
          Accounts
          <button className="link" onClick={() => onNavigate('budget')}>
            See all
          </button>
        </h3>
        {!simplefinConfigured ? (
          <div className="empty-state">Connect a bank in Settings to see accounts here.</div>
        ) : simplefinAccounts.length === 0 ? (
          <div className="empty-state">No accounts synced yet — open Budget to sync.</div>
        ) : (
          <div className="list">
            {simplefinAccounts.map((a) => (
              <div className="fin-row" key={a.id}>
                <Glyph label={a.orgName ?? a.name} />
                <div className="fin-row-main">
                  <div className="fin-row-title">{a.name}</div>
                  <div className="fin-row-sub">{a.orgName ?? 'Bank'}</div>
                </div>
                <div className="fin-row-amount">{formatMoney(a.balance)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card span-2">
        <h3>
          To-do
          <button className="link" onClick={() => onNavigate('reminders')}>
            View all
          </button>
        </h3>
        {upcomingReminders.length === 0 ? (
          <div className="empty-state">Nothing on your list.</div>
        ) : (
          <div className="list">
            {upcomingReminders.map((r) => (
              <div className="fin-row" key={r.id}>
                <Glyph label={r.title} />
                <div className="fin-row-main">
                  <div className="fin-row-title">{r.title}</div>
                  <div className="fin-row-sub">{relativeDayLabel(new Date(r.dueAt), now)}</div>
                </div>
                <button className="btn btn-sm" onClick={() => toggleReminderComplete(r)}>
                  Done
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card span-2">
        <h3>Today's schedule</h3>
        {todayScheduleItems.length === 0 ? (
          <div className="empty-state">Nothing on the calendar for today.</div>
        ) : (
          <div className="list">
            {todayScheduleItems.map((e) => (
              <div className="fin-row" key={e.id}>
                <Glyph label={e.title} />
                <div className="fin-row-main">
                  <div className="fin-row-title">{e.title}</div>
                  <div className="fin-row-sub">{e.location ?? (e.source === 'canvas' ? 'Assignment due' : 'Event')}</div>
                </div>
                <div className="fin-row-amount" style={{ fontSize: 12, fontWeight: 500 }}>
                  {e.allDay
                    ? 'All day'
                    : new Date(e.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card span-2">
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', flex: 1 }}>{assistantExchange.reply}</div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => speak(assistantExchange.reply)}
                      title="Play this reply aloud — tapping here is required for audio to play on iPhone/iPad"
                      style={{ flexShrink: 0, padding: '4px 8px' }}
                    >
                      🔊
                    </button>
                  </div>
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

      <div className="card span-4">
        <h3>
          This week
          <button className="link" onClick={() => onNavigate('calendar')}>
            Open Calendar
          </button>
        </h3>
        {weekCalError && (
          <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
            {weekCalError}
          </p>
        )}
        {weekEvents.length === 0 ? (
          <div className="empty-state">
            Nothing scheduled yet — connect Google Calendar and/or Canvas in Settings to see your week here.
          </div>
        ) : (
          <WeekCalendar events={weekEvents} onDelete={removeWeekEvent} />
        )}
      </div>

      <div className="card span-2">
        <h3>Latest activity</h3>
        <div className="oura-tabs">
          {(['all', 'reminder', 'assignment', 'event'] as const).map((f) => (
            <button
              key={f}
              className={`oura-tab${activityFilter === f ? ' active' : ''}`}
              style={{ ['--tab-color' as string]: 'var(--accent)' }}
              onClick={() => setActivityFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'reminder' ? 'Reminders' : f === 'assignment' ? 'Assignments' : 'Events'}
            </button>
          ))}
        </div>
        {filteredActivity.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 14 }}>
            Nothing coming up — you're all caught up.
          </div>
        ) : (
          <div className="list" style={{ marginTop: 14 }}>
            {filteredActivity.map((item) => (
              <div className="list-row" key={item.id}>
                <div className="list-row-main">
                  <div className="list-row-title">
                    <span className={`dv2-dot dv2-dot-${item.type}`} aria-hidden />
                    {item.title}
                  </div>
                  <div className="list-row-sub">{item.subtitle}</div>
                </div>
                <div className="list-row-actions">
                  <span className="dv2-activity-badge">{relativeDayLabel(item.date, now)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card span-2">
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

      <div className="card span-2">
        <h3>
          Spending breakdown
          <button className="link" onClick={() => onNavigate('budget')}>
            View all
          </button>
        </h3>
        {expenseBreakdown.length === 0 ? (
          <div className="empty-state">No expenses logged yet.</div>
        ) : (
          <>
            <div className="dv2-stacked-bar">
              {expenseBreakdown.map((r) => (
                <div
                  key={r.categoryId}
                  style={{ flex: r.pct, background: r.color }}
                  title={`${r.name}: ${formatMoney(r.spent)} (${Math.round(r.pct)}%)`}
                />
              ))}
            </div>
            <div className="dv2-legend">
              {expenseBreakdown.map((r) => (
                <div className="dv2-legend-row" key={r.categoryId}>
                  <span className="dv2-legend-dot" style={{ background: r.color }} />
                  <span className="dv2-legend-name">{r.name}</span>
                  <span className="muted">{Math.round(r.pct)}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card span-2">
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

      <div className="card span-2">
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

      <div className="card span-4">
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
