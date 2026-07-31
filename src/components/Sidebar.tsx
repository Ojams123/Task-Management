import type { ComponentType } from 'react'
import {
  BellIcon,
  CanvasIcon,
  ClaudeIcon,
  DashboardIcon,
  DumbbellIcon,
  GmailIcon,
  GoogleCalendarIcon,
  SlidersIcon,
  TargetIcon,
  WalletIcon,
  type IconProps,
} from './icons'

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

const NAV_ITEMS: { id: Page; label: string; icon: ComponentType<IconProps> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'reminders', label: 'Reminders', icon: BellIcon },
  { id: 'goals', label: 'Goals & Progress', icon: TargetIcon },
  { id: 'budget', label: 'Budget', icon: WalletIcon },
  { id: 'fitness', label: 'Fitness', icon: DumbbellIcon },
  { id: 'assignments', label: 'Assignments', icon: CanvasIcon },
  { id: 'calendar', label: 'Calendar', icon: GoogleCalendarIcon },
  { id: 'notifications', label: 'Notifications', icon: GmailIcon },
  { id: 'assistant', label: 'Assistant', icon: ClaudeIcon },
  { id: 'settings', label: 'Settings', icon: SlidersIcon },
]

export function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  return (
    <nav className="sidebar">
      <h1>
        Device<span>Hub</span>
      </h1>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            className={`nav-item${page === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">
              <Icon size={17} />
            </span>
            {item.label}
          </button>
        )
      })}
      <div className="sidebar-footer">Your day, organized locally.</div>
    </nav>
  )
}
