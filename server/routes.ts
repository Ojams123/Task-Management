import type { Express } from 'express'
import { Router } from 'express'
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
import { runAssistantTurn } from '../core/integrations/assistant'
import { fetchOuraSummary } from '../core/integrations/oura'
import { buildAuthUrl, exchangeCode } from './googleOAuth'
import { requireAuth } from './auth'
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

function asyncHandler(fn: (req: import('express').Request, res: import('express').Response) => Promise<unknown>) {
  return (req: import('express').Request, res: import('express').Response) => {
    fn(req, res).catch((err) => {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected error' })
    })
  }
}

export function registerApiRoutes(app: Express, publicUrl: string) {
  const api = Router()
  api.use(requireAuth)

  // Reminders
  api.get('/reminders', (_req, res) => res.json(reminders.listReminders()))
  api.post('/reminders', (req, res) => res.json(reminders.createReminder(req.body)))
  api.patch('/reminders/:id', (req, res) => res.json(reminders.updateReminder(req.params.id, req.body)))
  api.delete('/reminders/:id', (req, res) => {
    reminders.removeReminder(req.params.id)
    res.json({ ok: true })
  })
  api.get('/reminders/fired-since', (req, res) => {
    const since = String(req.query.since ?? new Date(0).toISOString())
    res.json(reminders.listFiredSince(since))
  })

  // Goals
  api.get('/goals', (_req, res) => res.json(goals.listGoals()))
  api.post('/goals', (req, res) => res.json(goals.createGoal(req.body)))
  api.patch('/goals/:id', (req, res) => res.json(goals.updateGoal(req.params.id, req.body)))
  api.post('/goals/:id/log', (req, res) =>
    res.json(goals.logGoalProgress(req.params.id, req.body.delta, req.body.note))
  )
  api.get('/goals/:id/history', (req, res) => res.json(goals.goalHistory(req.params.id)))
  api.delete('/goals/:id', (req, res) => {
    goals.removeGoal(req.params.id)
    res.json({ ok: true })
  })

  // Budget
  api.get('/budget/categories', (_req, res) => res.json(budget.listCategories()))
  api.post('/budget/categories', (req, res) => res.json(budget.createCategory(req.body)))
  api.delete('/budget/categories/:id', (req, res) => {
    budget.removeCategory(req.params.id)
    res.json({ ok: true })
  })
  api.get('/budget/transactions', (req, res) =>
    res.json(budget.listTransactions(req.query.month ? String(req.query.month) : undefined))
  )
  api.post('/budget/transactions', (req, res) => res.json(budget.createTransaction(req.body)))
  api.delete('/budget/transactions/:id', (req, res) => {
    budget.removeTransaction(req.params.id)
    res.json({ ok: true })
  })
  api.get('/budget/summary', (req, res) =>
    res.json(budget.summary(req.query.month ? String(req.query.month) : undefined))
  )

  // Canvas
  api.get('/canvas/settings', (_req, res) => res.json(getCanvasSettings()))
  api.post('/canvas/settings', (req, res) => {
    const settings = req.body as CanvasSettings
    setSecret(CANVAS_DOMAIN_KEY, settings.domain)
    setSecret(CANVAS_TOKEN_KEY, settings.token)
    res.json({ ok: true })
  })
  api.post(
    '/canvas/sync',
    asyncHandler(async (_req, res) => {
      const settings = getCanvasSettings()
      if (!settings) {
        res.status(400).json({ error: 'Canvas is not configured yet. Add your domain and token in Settings.' })
        return
      }
      const assignments = await fetchAssignments(settings)
      canvasRepo.replaceCachedAssignments(assignments)
      res.json(assignments)
    })
  )
  api.get('/canvas/cached', (_req, res) => res.json(canvasRepo.listCachedAssignments()))

  // Notifications / Gmail
  api.get('/notifications/google-status', (_req, res) => {
    const email = getSecret(GOOGLE_EMAIL_KEY)
    const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
    res.json({ connected: !!refreshToken, email })
  })
  api.post('/notifications/google-credentials', (req, res) => {
    setSecret(GOOGLE_CLIENT_ID_KEY, req.body.clientId)
    setSecret(GOOGLE_CLIENT_SECRET_KEY, req.body.clientSecret)
    res.json({ ok: true })
  })
  api.get('/google/connect', (_req, res) => {
    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    if (!clientId || !clientSecret) {
      res.status(400).json({ error: 'Add your Google OAuth client ID and secret in Settings first.' })
      return
    }
    const redirectUri = `${publicUrl}/api/google/callback`
    const url = buildAuthUrl(clientId, clientSecret, redirectUri)
    res.json({ url })
  })
  api.post('/notifications/disconnect-google', (_req, res) => {
    deleteSecret(GOOGLE_REFRESH_TOKEN_KEY)
    deleteSecret(GOOGLE_EMAIL_KEY)
    res.json({ ok: true })
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
  api.get('/notifications/digest', asyncHandler(async (_req, res) => res.json(await buildDigest())))
  api.post('/notifications/refresh-digest', asyncHandler(async (_req, res) => res.json(await buildDigest())))

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
  api.get('/calendar/events', (_req, res) => res.json(calendarRepo.listCachedEvents()))
  api.post('/calendar/refresh', asyncHandler(async (_req, res) => res.json(await syncCalendar())))

  // Fitness
  api.get('/fitness/food', (req, res) => res.json(fitness.listFood(req.query.date ? String(req.query.date) : undefined)))
  api.post('/fitness/food', (req, res) => res.json(fitness.createFood(req.body)))
  api.delete('/fitness/food/:id', (req, res) => {
    fitness.removeFood(req.params.id)
    res.json({ ok: true })
  })
  api.get('/fitness/exercise', (req, res) =>
    res.json(fitness.listExercise(req.query.date ? String(req.query.date) : undefined))
  )
  api.post('/fitness/exercise', (req, res) => res.json(fitness.createExercise(req.body)))
  api.delete('/fitness/exercise/:id', (req, res) => {
    fitness.removeExercise(req.params.id)
    res.json({ ok: true })
  })
  api.get('/fitness/calorie-target', (_req, res) => {
    const stored = getSecret(CALORIE_TARGET_KEY)
    res.json(stored ? Number(stored) : DEFAULT_CALORIE_TARGET)
  })
  api.post('/fitness/calorie-target', (req, res) => {
    setSecret(CALORIE_TARGET_KEY, String(req.body.target))
    res.json({ ok: true })
  })
  api.get('/fitness/daily-summary', (req, res) => {
    const targetDate = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10)
    const { consumed, burned } = fitness.dailyTotals(targetDate)
    const stored = getSecret(CALORIE_TARGET_KEY)
    const target = stored ? Number(stored) : DEFAULT_CALORIE_TARGET
    res.json({ date: targetDate, consumed, burned, target, net: consumed - burned })
  })

  // Assistant
  api.get('/assistant/status', (_req, res) => res.json({ configured: !!getSecret(ANTHROPIC_API_KEY) }))
  api.post('/assistant/api-key', (req, res) => {
    setSecret(ANTHROPIC_API_KEY, req.body.apiKey)
    res.json({ ok: true })
  })
  api.get('/assistant/history', (_req, res) => res.json(chat.listMessages()))
  api.post(
    '/assistant/message',
    asyncHandler(async (req, res) => {
      const apiKey = getSecret(ANTHROPIC_API_KEY)
      if (!apiKey) {
        res.status(400).json({ error: 'Add your Anthropic API key in Settings to enable the assistant.' })
        return
      }
      const history = chat.listMessages()
      chat.addMessage('user', req.body.content)
      const reply = await runAssistantTurn(apiKey, history, req.body.content)
      chat.addMessage('assistant', reply)
      res.json(chat.listMessages())
    })
  )
  api.delete('/assistant/history', (_req, res) => {
    chat.clearMessages()
    res.json({ ok: true })
  })

  // Oura
  api.get('/oura/status', (_req, res) => res.json({ configured: !!getSecret(OURA_TOKEN_KEY) }))
  api.post('/oura/token', (req, res) => {
    setSecret(OURA_TOKEN_KEY, req.body.token)
    res.json({ ok: true })
  })
  api.post(
    '/oura/sync',
    asyncHandler(async (_req, res) => {
      const token = getSecret(OURA_TOKEN_KEY)
      if (!token) {
        res.status(400).json({ error: 'Add your Oura personal access token in Settings first.' })
        return
      }
      const days = await fetchOuraSummary(token)
      ouraRepo.replaceCachedOuraDays(days)
      res.json(ouraRepo.listCachedOuraDays())
    })
  )
  api.get('/oura/cached', (_req, res) => res.json(ouraRepo.listCachedOuraDays()))

  // Google's redirect lands here after consent — registered before the
  // requireAuth-gated router below so it's never blocked by that middleware;
  // it's the browser being redirected top-level by Google, not an XHR from
  // our own frontend, and the short-lived authorization code is the proof.
  app.get('/api/google/callback', (req, res) => {
    const code = String(req.query.code ?? '')
    const error = req.query.error
    const redirectUri = `${publicUrl}/api/google/callback`

    if (error || !code) {
      res.redirect('/settings?google=error')
      return
    }

    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    if (!clientId || !clientSecret) {
      res.redirect('/settings?google=error')
      return
    }

    exchangeCode(clientId, clientSecret, redirectUri, code)
      .then(({ refreshToken, email }) => {
        setSecret(GOOGLE_REFRESH_TOKEN_KEY, refreshToken)
        setSecret(GOOGLE_EMAIL_KEY, email)
        res.redirect('/settings?google=connected')
      })
      .catch(() => res.redirect('/settings?google=error'))
  })

  app.use('/api', api)
}
