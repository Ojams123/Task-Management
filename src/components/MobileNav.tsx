import { DashboardIcon, BellIcon, WalletIcon, ClaudeIcon } from './icons'
import type { Page } from './Sidebar'

const ITEMS: { id: Page; label: string; icon: typeof DashboardIcon }[] = [
  { id: 'dashboard', label: 'Home', icon: DashboardIcon },
  { id: 'reminders', label: 'Reminders', icon: BellIcon },
  { id: 'budget', label: 'Budget', icon: WalletIcon },
  { id: 'assistant', label: 'Assistant', icon: ClaudeIcon },
]

export function MobileNav({
  page,
  onNavigate,
  onMore,
}: {
  page: Page
  onNavigate: (p: Page) => void
  onMore: () => void
}) {
  const moreActive = !ITEMS.some((i) => i.id === page)
  return (
    <nav className="mobile-nav">
      {ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            className={`mobile-nav-btn${page === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </button>
        )
      })}
      <button className={`mobile-nav-btn${moreActive ? ' active' : ''}`} onClick={onMore}>
        <span className="mobile-nav-menu-icon" aria-hidden="true">
          ☰
        </span>
        <span>Menu</span>
      </button>
    </nav>
  )
}
