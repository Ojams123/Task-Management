import type { ComponentType } from 'react'
import {
  BellIcon,
  CanvasIcon,
  ClaudeIcon,
  CloudSunIcon,
  DashboardIcon,
  DumbbellIcon,
  GmailIcon,
  GoogleCalendarIcon,
  LinkedInIcon,
  MicrosoftIcon,
  SlidersIcon,
  SpotifyIcon,
  StravaIcon,
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
  | 'weather'
  | 'spotify'
  | 'strava'
  | 'microsoft'
  | 'linkedin'
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
  { id: 'weather', label: 'Weather', icon: CloudSunIcon },
  { id: 'spotify', label: 'Spotify', icon: SpotifyIcon },
  { id: 'strava', label: 'Strava', icon: StravaIcon },
  { id: 'microsoft', label: 'Microsoft 365', icon: MicrosoftIcon },
  { id: 'linkedin', label: 'LinkedIn', icon: LinkedInIcon },
  { id: 'notifications', label: 'Notifications', icon: GmailIcon },
  { id: 'assistant', label: 'Assistant', icon: ClaudeIcon },
  { id: 'settings', label: 'Settings', icon: SlidersIcon },
]

export function Sidebar({
  page,
  onNavigate,
  mobileOpen,
}: {
  page: Page
  onNavigate: (p: Page) => void
  mobileOpen?: boolean
}) {
  return (
    <nav className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
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
