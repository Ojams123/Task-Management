import { useState } from 'react'
import './App.css'
import { IS_ELECTRON } from './bootstrap'
import { Sidebar, type Page } from './components/Sidebar'
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
  notifications: 'Notifications',
  assistant: 'Assistant',
  settings: 'Settings',
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  useBrowserReminderNotifications(!IS_ELECTRON)

  const shell = (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="main-area">
        <div className="top-bar">
          <h2>{PAGE_TITLES[page]}</h2>
          <VoiceBar onNavigate={setPage} />
        </div>
        <div className="page-content">
          {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
          {page === 'reminders' && <Reminders />}
          {page === 'goals' && <Goals />}
          {page === 'budget' && <Budget />}
          {page === 'fitness' && <Fitness onNavigate={setPage} />}
          {page === 'assignments' && <Assignments onNavigate={setPage} />}
          {page === 'calendar' && <Calendar onNavigate={setPage} />}
          {page === 'notifications' && <Notifications onNavigate={setPage} />}
          {page === 'assistant' && <Assistant onNavigate={setPage} />}
          {page === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  )

  return IS_ELECTRON ? shell : <AuthGate>{shell}</AuthGate>
}

export default App
