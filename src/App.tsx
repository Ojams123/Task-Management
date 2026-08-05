import { useEffect, useState } from 'react'
import './App.css'
import { IS_ELECTRON } from './bootstrap'
import { Sidebar, type Page } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { VoiceBar } from './components/VoiceBar'
import { AuthGate } from './components/AuthGate'
import { useBrowserReminderNotifications } from './hooks/useBrowserReminderNotifications'
import { Dashboard } from './pages/Dashboard'
import { Reminders } from './pages/Reminders'
import { Goals } from './pages/Goals'
import { Budget } from './pages/Budget'
import { Fitness } from './pages/Fitness'
import { Assignments } from './pages/Assignments'
import { Calendar } from './pages/Calendar'
import { Weather } from './pages/Weather'
import { Spotify } from './pages/Spotify'
import { Strava } from './pages/Strava'
import { Microsoft } from './pages/Microsoft'
import { LinkedIn } from './pages/LinkedIn'
import { Notifications } from './pages/Notifications'
import { Assistant } from './pages/Assistant'
import { Settings } from './pages/Settings'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  reminders: 'Reminders',
  goals: 'Goals & Progress',
  budget: 'Budget',
  fitness: 'Fitness',
  assignments: 'Assignments',
  calendar: 'Calendar',
  weather: 'Weather',
  spotify: 'Spotify',
  strava: 'Strava',
  microsoft: 'Microsoft 365',
  linkedin: 'LinkedIn',
  notifications: 'Notifications',
  assistant: 'Assistant',
  settings: 'Settings',
}

type ViewMode = 'auto' | 'mobile' | 'desktop'

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [navOpen, setNavOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('dh-view-mode')
    return saved === 'mobile' || saved === 'desktop' ? saved : 'auto'
  })
  const [narrowViewport, setNarrowViewport] = useState(
    () => window.matchMedia('(max-width: 860px)').matches
  )
  useBrowserReminderNotifications(!IS_ELECTRON)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)')
    const handler = (e: MediaQueryListEvent) => setNarrowViewport(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    localStorage.setItem('dh-view-mode', viewMode)
  }, [viewMode])

  const isMobile = viewMode === 'mobile' || (viewMode === 'auto' && narrowViewport)

  function navigate(p: Page) {
    setPage(p)
    setNavOpen(false)
  }

  const shell = (
    <div className={`app-shell${isMobile ? ' mobile-layout' : ''}`}>
      <Sidebar page={page} onNavigate={navigate} mobileOpen={navOpen} />
      {navOpen && <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} />}
      <div className="main-area">
        <div className="top-bar">
          <button className="hamburger-btn" onClick={() => setNavOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <h2>{PAGE_TITLES[page]}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="view-toggle-btn"
              onClick={() => setViewMode(isMobile ? 'desktop' : 'mobile')}
              title="Force the layout regardless of window size"
            >
              <span aria-hidden="true">{isMobile ? '🖥' : '📱'}</span>
              <span className="view-toggle-label">{isMobile ? 'Desktop view' : 'Mobile view'}</span>
            </button>
            <VoiceBar onNavigate={setPage} />
          </div>
        </div>
        <div className="page-content">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'reminders' && <Reminders />}
          {page === 'goals' && <Goals />}
          {page === 'budget' && <Budget />}
          {page === 'fitness' && <Fitness onNavigate={setPage} />}
          {page === 'assignments' && <Assignments onNavigate={setPage} />}
          {page === 'calendar' && <Calendar onNavigate={setPage} />}
          {page === 'weather' && <Weather onNavigate={setPage} />}
          {page === 'spotify' && <Spotify onNavigate={setPage} />}
          {page === 'strava' && <Strava onNavigate={setPage} />}
          {page === 'microsoft' && <Microsoft onNavigate={setPage} />}
          {page === 'linkedin' && <LinkedIn onNavigate={setPage} />}
          {page === 'notifications' && <Notifications onNavigate={setPage} />}
          {page === 'assistant' && <Assistant onNavigate={setPage} />}
          {page === 'settings' && <Settings />}
        </div>
      </div>
      <MobileNav page={page} onNavigate={navigate} onMore={() => setNavOpen(true)} />
    </div>
  )

  return IS_ELECTRON ? shell : <AuthGate>{shell}</AuthGate>
}

export default App
