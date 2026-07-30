import { ipcMain, Notification } from 'electron'
import * as reminders from './db/repos/reminders'
import * as goals from './db/repos/goals'
import * as budget from './db/repos/budget'
import * as canvasRepo from './db/repos/canvas'
import { getSecret, setSecret, deleteSecret } from './db/repos/settings'
import { fetchAssignments } from './integrations/canvas'
import { fetchUnreadDigest, runOAuthFlow } from './integrations/gmail'
import type { CanvasSettings, NotificationDigest } from '../src/shared/types'

const CANVAS_DOMAIN_KEY = 'canvas.domain'
const CANVAS_TOKEN_KEY = 'canvas.token'
const GOOGLE_CLIENT_ID_KEY = 'google.clientId'
const GOOGLE_CLIENT_SECRET_KEY = 'google.clientSecret'
const GOOGLE_REFRESH_TOKEN_KEY = 'google.refreshToken'
const GOOGLE_EMAIL_KEY = 'google.email'
const LAST_NOTIFICATION_CHECK_KEY = 'notifications.lastCheck'

function getCanvasSettings(): CanvasSettings | null {
  const domain = getSecret(CANVAS_DOMAIN_KEY)
  const token = getSecret(CANVAS_TOKEN_KEY)
  if (!domain || !token) return null
  return { domain, token }
}

export function registerIpcHandlers() {
  // Reminders
  ipcMain.handle('reminders:list', () => reminders.listReminders())
  ipcMain.handle('reminders:create', (_e, input) => reminders.createReminder(input))
  ipcMain.handle('reminders:update', (_e, id, updates) => reminders.updateReminder(id, updates))
  ipcMain.handle('reminders:remove', (_e, id) => reminders.removeReminder(id))

  // Goals
  ipcMain.handle('goals:list', () => goals.listGoals())
  ipcMain.handle('goals:create', (_e, input) => goals.createGoal(input))
  ipcMain.handle('goals:update', (_e, id, updates) => goals.updateGoal(id, updates))
  ipcMain.handle('goals:logProgress', (_e, id, delta, note) => goals.logGoalProgress(id, delta, note))
  ipcMain.handle('goals:history', (_e, id) => goals.goalHistory(id))
  ipcMain.handle('goals:remove', (_e, id) => goals.removeGoal(id))

  // Budget
  ipcMain.handle('budget:listCategories', () => budget.listCategories())
  ipcMain.handle('budget:createCategory', (_e, input) => budget.createCategory(input))
  ipcMain.handle('budget:removeCategory', (_e, id) => budget.removeCategory(id))
  ipcMain.handle('budget:listTransactions', (_e, month) => budget.listTransactions(month))
  ipcMain.handle('budget:createTransaction', (_e, input) => budget.createTransaction(input))
  ipcMain.handle('budget:removeTransaction', (_e, id) => budget.removeTransaction(id))
  ipcMain.handle('budget:summary', (_e, month) => budget.summary(month))

  // Canvas
  ipcMain.handle('canvas:getSettings', () => getCanvasSettings())
  ipcMain.handle('canvas:saveSettings', (_e, settings: CanvasSettings) => {
    setSecret(CANVAS_DOMAIN_KEY, settings.domain)
    setSecret(CANVAS_TOKEN_KEY, settings.token)
  })
  ipcMain.handle('canvas:sync', async () => {
    const settings = getCanvasSettings()
    if (!settings) throw new Error('Canvas is not configured yet. Add your domain and token in Settings.')
    const assignments = await fetchAssignments(settings)
    canvasRepo.replaceCachedAssignments(assignments)
    return assignments
  })
  ipcMain.handle('canvas:listCached', () => canvasRepo.listCachedAssignments())

  // Notifications / Gmail
  ipcMain.handle('notifications:getGoogleAuthStatus', () => {
    const email = getSecret(GOOGLE_EMAIL_KEY)
    const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
    return { connected: !!refreshToken, email }
  })
  ipcMain.handle('notifications:saveGoogleCredentials', (_e, clientId: string, clientSecret: string) => {
    setSecret(GOOGLE_CLIENT_ID_KEY, clientId)
    setSecret(GOOGLE_CLIENT_SECRET_KEY, clientSecret)
  })
  ipcMain.handle('notifications:connectGoogle', async () => {
    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    if (!clientId || !clientSecret) {
      throw new Error('Add your Google OAuth client ID and secret in Settings first.')
    }
    const { refreshToken, email } = await runOAuthFlow(clientId, clientSecret)
    setSecret(GOOGLE_REFRESH_TOKEN_KEY, refreshToken)
    setSecret(GOOGLE_EMAIL_KEY, email)
    return { connected: true, email }
  })
  ipcMain.handle('notifications:disconnectGoogle', () => {
    deleteSecret(GOOGLE_REFRESH_TOKEN_KEY)
    deleteSecret(GOOGLE_EMAIL_KEY)
  })

  async function buildDigest(): Promise<NotificationDigest> {
    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
    const lastCheck = getSecret(LAST_NOTIFICATION_CHECK_KEY)
    const now = new Date().toISOString()

    if (!clientId || !clientSecret || !refreshToken) {
      return { generatedAt: now, sinceLastCheck: lastCheck ?? now, totalUnread: 0, items: [] }
    }

    const items = await fetchUnreadDigest(clientId, clientSecret, refreshToken, lastCheck)
    setSecret(LAST_NOTIFICATION_CHECK_KEY, now)
    return { generatedAt: now, sinceLastCheck: lastCheck ?? now, totalUnread: items.length, items }
  }

  ipcMain.handle('notifications:getDigest', () => buildDigest())
  ipcMain.handle('notifications:refreshDigest', () => buildDigest())

  // System
  ipcMain.handle('system:notify', (_e, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })
}
