import { useState } from 'react'
import './App.css'
import { Sidebar, type Page } from './components/Sidebar'
import { VoiceBar } from './components/VoiceBar'
import { Dashboard } from './pages/Dashboard'
import { Reminders } from './pages/Reminders'
import { Goals } from './pages/Goals'
import { Budget } from './pages/Budget'
import { Assignments } from './pages/Assignments'
import { Notifications } from './pages/Notifications'
import { Settings } from './pages/Settings'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  reminders: 'Reminders',
  goals: 'Goals & Progress',
  budget: 'Budget',
  assignments: 'Assignments',
  notifications: 'Notifications',
  settings: 'Settings',
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
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
          {page === 'assignments' && <Assignments onNavigate={setPage} />}
          {page === 'notifications' && <Notifications onNavigate={setPage} />}
          {page === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  )
}

export default App
