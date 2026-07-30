export type Page =
  | 'dashboard'
  | 'reminders'
  | 'goals'
  | 'budget'
  | 'assignments'
  | 'notifications'
  | 'settings'

const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'goals', label: 'Goals & Progress' },
  { id: 'budget', label: 'Budget' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'notifications', label: 'Notifications' },
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
