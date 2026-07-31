import { ipcMain, Notification } from 'electron'
import * as reminders from '../core/db/repos/reminders'
import * as goals from '../core/db/repos/goals'
import * as budget from '../core/db/repos/budget'
import * as canvasRepo from '../core/db/repos/canvas'
import * as calendarRepo from '../core/db/repos/calendar'
import * as fitness from '../core/db/repos/fitness'
import * as chat from '../core/db/repos/chat'
import * as ouraRepo from '../core/db/repos/oura'
import { getSecret, setSecret, deleteSecret } from '../core/db/repos/settings'
import { fetchAssignments } from '../core/integrations/canvas'
import { fetchUnreadDigest } from '../core/integrations/gmail'
import { fetchUpcomingEvents } from '../core/integrations/calendar'
import { runOAuthFlow } from './integrations/googleAuth'
import { runAssistantTurn } from '../core/integrations/assistant'
import { fetchOuraSummary } from '../core/integrations/oura'
import type { CanvasSettings, NotificationDigest } from '../src/shared/types'

const CANVAS_DOMAIN_KEY = 'canvas.domain'
const CANVAS_TOKEN_KEY = 'canvas.token'
const GOOGLE_CLIENT_ID_KEY = 'google.clientId'
const GOOGLE_CLIENT_SECRET_KEY = 'google.clientSecret'
const GOOGLE_REFRESH_TOKEN_KEY = 'google.refreshToken'
const GOOGLE_EMAIL_KEY = 'google.email'
const LAST_NOTIFICATION_CHECK_KEY = 'notifications.lastCheck'
const CALORIE_TARGET_KEY = 'fitness.calorieTarget'
const ANTHROPIC_API_KEY = 'assistant.anthropicApiKey'
const OURA_TOKEN_KEY = 'oura.token'
const DEFAULT_CALORIE_TARGET = 2000

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

  // Calendar
  async function syncCalendar() {
    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
    if (!clientId || !clientSecret || !refreshToken) return []
    const events = await fetchUpcomingEvents(clientId, clientSecret, refreshToken)
    calendarRepo.replaceCachedEvents(events)
    return events
  }
  ipcMain.handle('calendar:getEvents', () => calendarRepo.listCachedEvents())
  ipcMain.handle('calendar:refreshEvents', () => syncCalendar())

  // Fitness
  ipcMain.handle('fitness:listFood', (_e, date) => fitness.listFood(date))
  ipcMain.handle('fitness:createFood', (_e, input) => fitness.createFood(input))
  ipcMain.handle('fitness:removeFood', (_e, id) => fitness.removeFood(id))
  ipcMain.handle('fitness:listExercise', (_e, date) => fitness.listExercise(date))
  ipcMain.handle('fitness:createExercise', (_e, input) => fitness.createExercise(input))
  ipcMain.handle('fitness:removeExercise', (_e, id) => fitness.removeExercise(id))
  ipcMain.handle('fitness:getCalorieTarget', () => {
    const stored = getSecret(CALORIE_TARGET_KEY)
    return stored ? Number(stored) : DEFAULT_CALORIE_TARGET
  })
  ipcMain.handle('fitness:setCalorieTarget', (_e, target: number) => {
    setSecret(CALORIE_TARGET_KEY, String(target))
  })
  ipcMain.handle('fitness:dailySummary', (_e, date?: string) => {
    const targetDate = date ?? new Date().toISOString().slice(0, 10)
    const { consumed, burned } = fitness.dailyTotals(targetDate)
    const stored = getSecret(CALORIE_TARGET_KEY)
    const target = stored ? Number(stored) : DEFAULT_CALORIE_TARGET
    return { date: targetDate, consumed, burned, target, net: consumed - burned }
  })

  // Assistant
  ipcMain.handle('assistant:getStatus', () => ({ configured: !!getSecret(ANTHROPIC_API_KEY) }))
  ipcMain.handle('assistant:saveApiKey', (_e, apiKey: string) => {
    setSecret(ANTHROPIC_API_KEY, apiKey)
  })
  ipcMain.handle('assistant:getHistory', () => chat.listMessages())
  ipcMain.handle('assistant:sendMessage', async (_e, content: string) => {
    const apiKey = getSecret(ANTHROPIC_API_KEY)
    if (!apiKey) throw new Error('Add your Anthropic API key in Settings to enable the assistant.')
    const history = chat.listMessages()
    chat.addMessage('user', content)
    const reply = await runAssistantTurn(apiKey, history, content)
    chat.addMessage('assistant', reply)
    return chat.listMessages()
  })
  ipcMain.handle('assistant:clearHistory', () => chat.clearMessages())

  // Oura
  ipcMain.handle('oura:getStatus', () => ({ configured: !!getSecret(OURA_TOKEN_KEY) }))
  ipcMain.handle('oura:saveToken', (_e, token: string) => {
    setSecret(OURA_TOKEN_KEY, token)
  })
  ipcMain.handle('oura:sync', async () => {
    const token = getSecret(OURA_TOKEN_KEY)
    if (!token) throw new Error('Add your Oura personal access token in Settings first.')
    const days = await fetchOuraSummary(token)
    ouraRepo.replaceCachedOuraDays(days)
    return ouraRepo.listCachedOuraDays()
  })
  ipcMain.handle('oura:listCached', () => ouraRepo.listCachedOuraDays())

  // System
  ipcMain.handle('system:notify', (_e, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })
}
