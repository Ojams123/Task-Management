export type Page =
  | 'dashboard'
  | 'reminders'
  | 'goals'
  | 'budget'
  | 'assignments'
  | 'calendar'
  | 'fitness'
  | 'notifications'
  | 'assistant'
  | 'settings'

const NAV_ITEMS: { id: Page; label: string; dot: string }[] = [
  { id: 'dashboard', label: 'Dashboard', dot: 'var(--hue-1)' },
  { id: 'reminders', label: 'Reminders', dot: 'var(--hue-2)' },
  { id: 'goals', label: 'Goals & Progress', dot: 'var(--hue-3)' },
  { id: 'budget', label: 'Budget', dot: 'var(--hue-4)' },
  { id: 'fitness', label: 'Fitness', dot: 'var(--hue-5)' },
  { id: 'assignments', label: 'Assignments', dot: 'var(--hue-6)' },
  { id: 'calendar', label: 'Calendar', dot: 'var(--hue-2)' },
  { id: 'notifications', label: 'Notifications', dot: 'var(--hue-6)' },
  { id: 'assistant', label: 'Assistant', dot: 'var(--hue-1)' },
  { id: 'settings', label: 'Settings', dot: 'var(--text-muted)' },
]

export function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  return (
    <nav className="sidebar">
      <h1>
        Device<span>Hub</span>
      </h1>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item${page === item.id ? ' active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-dot" style={{ background: item.dot }} />
          {item.label}
        </button>
      ))}
      <div className="sidebar-footer">Your day, organized locally.</div>
    </nav>
  )
}
