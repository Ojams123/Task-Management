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

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'goals', label: 'Goals & Progress' },
  { id: 'budget', label: 'Budget' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'assistant', label: 'Assistant' },
  { id: 'settings', label: 'Settings' },
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
          {item.label}
        </button>
      ))}
      <div className="sidebar-footer">Your day, organized locally.</div>
    </nav>
  )
}
