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
import * as plaidRepo from '../core/db/repos/plaid'
import * as weatherRepo from '../core/db/repos/weather'
import * as spotifyRepo from '../core/db/repos/spotify'
import * as stravaRepo from '../core/db/repos/strava'
import * as microsoftRepo from '../core/db/repos/microsoft'
import * as linkedinRepo from '../core/db/repos/linkedin'
import { getSecret, setSecret, deleteSecret } from '../core/db/repos/settings'
import { fetchAssignments } from '../core/integrations/canvas'
import { fetchUnreadDigest, markMessageAsRead } from '../core/integrations/gmail'
import { fetchUpcomingEvents, createCalendarEvent, deleteCalendarEvent } from '../core/integrations/calendar'
import { runAssistantTurn } from '../core/integrations/assistant'
import { fetchOuraSummary } from '../core/integrations/oura'
import * as plaid from '../core/integrations/plaid'
import type { PlaidEnvironment } from '../core/integrations/plaid'
import { fetchWeather } from '../core/integrations/weather'
import {
  buildSpotifyAuthUrl,
  exchangeSpotifyCode,
  fetchSpotifySnapshot,
  fetchPlaybackState,
  controlSpotifyPlayback,
  type SpotifyCreds,
  type SpotifyPlaybackAction,
} from '../core/integrations/spotify'
import {
  buildStravaAuthUrl,
  exchangeStravaCode,
  fetchStravaSnapshot,
  createManualActivity,
  type StravaCreds,
  type NewStravaActivity,
} from '../core/integrations/strava'
import { buildMicrosoftAuthUrl, exchangeMicrosoftCode, fetchMicrosoftSnapshot, type MicrosoftCreds } from '../core/integrations/microsoft'
import { buildLinkedInAuthUrl, exchangeLinkedInCode, fetchLinkedInProfile, type LinkedInCreds } from '../core/integrations/linkedin'
import { buildAuthUrl, exchangeCode } from './googleOAuth'
import { requireAuth } from './auth'
import type { CanvasSettings, NotificationDigest, NewCalendarEvent } from '../src/shared/types'

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
const PROFILE_NAME_KEY = 'profile.name'
const PLAID_CLIENT_ID_KEY = 'plaid.clientId'
const PLAID_SECRET_KEY = 'plaid.secret'
const PLAID_ENV_KEY = 'plaid.environment'
const WEATHER_API_KEY = 'weather.apiKey'
const WEATHER_LOCATION_KEY = 'weather.location'
const SPOTIFY_CLIENT_ID_KEY = 'spotify.clientId'
const SPOTIFY_CLIENT_SECRET_KEY = 'spotify.clientSecret'
const SPOTIFY_REFRESH_TOKEN_KEY = 'spotify.refreshToken'
const STRAVA_CLIENT_ID_KEY = 'strava.clientId'
const STRAVA_CLIENT_SECRET_KEY = 'strava.clientSecret'
const STRAVA_REFRESH_TOKEN_KEY = 'strava.refreshToken'
const MICROSOFT_CLIENT_ID_KEY = 'microsoft.clientId'
const MICROSOFT_CLIENT_SECRET_KEY = 'microsoft.clientSecret'
const MICROSOFT_REFRESH_TOKEN_KEY = 'microsoft.refreshToken'
const LINKEDIN_CLIENT_ID_KEY = 'linkedin.clientId'
const LINKEDIN_CLIENT_SECRET_KEY = 'linkedin.clientSecret'
const DEFAULT_CALORIE_TARGET = 2000

function getMicrosoftCreds(): MicrosoftCreds | null {
  const clientId = getSecret(MICROSOFT_CLIENT_ID_KEY)
  const clientSecret = getSecret(MICROSOFT_CLIENT_SECRET_KEY)
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

function getLinkedInCreds(): LinkedInCreds | null {
  const clientId = getSecret(LINKEDIN_CLIENT_ID_KEY)
  const clientSecret = getSecret(LINKEDIN_CLIENT_SECRET_KEY)
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

function getSpotifyCreds(): SpotifyCreds | null {
  const clientId = getSecret(SPOTIFY_CLIENT_ID_KEY)
  const clientSecret = getSecret(SPOTIFY_CLIENT_SECRET_KEY)
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

function getStravaCreds(): StravaCreds | null {
  const clientId = getSecret(STRAVA_CLIENT_ID_KEY)
  const clientSecret = getSecret(STRAVA_CLIENT_SECRET_KEY)
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

function getCanvasSettings(): CanvasSettings | null {
  const domain = getSecret(CANVAS_DOMAIN_KEY)
  const token = getSecret(CANVAS_TOKEN_KEY)
  if (!domain || !token) return null
  return { domain, token }
}

function getPlaidCreds(): { clientId: string; secret: string; environment: PlaidEnvironment } | null {
  const clientId = getSecret(PLAID_CLIENT_ID_KEY)
  const secret = getSecret(PLAID_SECRET_KEY)
  const environment = (getSecret(PLAID_ENV_KEY) as PlaidEnvironment | null) ?? 'sandbox'
  if (!clientId || !secret) return null
  return { clientId, secret, environment }
}

async function syncAllPlaidItems() {
  const creds = getPlaidCreds()
  if (!creds) throw new Error('Add your Plaid client ID and secret in Settings first.')
  const items = plaidRepo.listItemsWithTokens()
  for (const item of items) {
    const accounts = await plaid.fetchAccounts(creds, item.accessToken)
    plaidRepo.replaceCachedAccounts(item.id, accounts)
    const transactions = await plaid.fetchTransactions(creds, item.accessToken)
    plaidRepo.replaceCachedTransactions(item.id, transactions)
  }
  return { accounts: plaidRepo.listCachedAccounts(), transactions: plaidRepo.listCachedTransactions() }
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
      res.json(canvasRepo.listCachedAssignments())
    })
  )
  api.get('/canvas/cached', (_req, res) => res.json(canvasRepo.listCachedAssignments()))
  api.post('/canvas/assignments/:id/complete', (req, res) => {
    canvasRepo.setLocalCompletion(String(req.params.id), !!req.body.completed)
    res.json(canvasRepo.listCachedAssignments())
  })

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
  api.post(
    '/notifications/mark-read/:id',
    asyncHandler(async (req, res) => {
      const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
      const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
      const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
      if (!clientId || !clientSecret || !refreshToken) {
        res.status(400).json({ error: 'Connect Google in Settings first.' })
        return
      }
      await markMessageAsRead(clientId, clientSecret, refreshToken, String(req.params.id))
      res.json({ ok: true })
    })
  )

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
  api.post(
    '/calendar/events',
    asyncHandler(async (req, res) => {
      const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
      const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
      const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
      if (!clientId || !clientSecret || !refreshToken) {
        res.status(400).json({ error: 'Connect Google in Settings first.' })
        return
      }
      await createCalendarEvent(clientId, clientSecret, refreshToken, req.body as NewCalendarEvent)
      res.json(await syncCalendar())
    })
  )
  api.delete(
    '/calendar/events/:id',
    asyncHandler(async (req, res) => {
      const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
      const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
      const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
      if (!clientId || !clientSecret || !refreshToken) {
        res.status(400).json({ error: 'Connect Google in Settings first.' })
        return
      }
      await deleteCalendarEvent(clientId, clientSecret, refreshToken, String(req.params.id))
      res.json(await syncCalendar())
    })
  )

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

  // Profile
  api.get('/profile/name', (_req, res) => res.json(getSecret(PROFILE_NAME_KEY)))
  api.post('/profile/name', (req, res) => {
    setSecret(PROFILE_NAME_KEY, req.body.name)
    res.json({ ok: true })
  })

  // Plaid
  api.get('/plaid/settings', (_req, res) => {
    const creds = getPlaidCreds()
    res.json({ configured: !!creds, environment: creds?.environment ?? 'sandbox' })
  })
  api.post('/plaid/settings', (req, res) => {
    setSecret(PLAID_CLIENT_ID_KEY, req.body.clientId)
    setSecret(PLAID_SECRET_KEY, req.body.secret)
    setSecret(PLAID_ENV_KEY, req.body.environment)
    res.json({ ok: true })
  })
  api.post(
    '/plaid/link-token',
    asyncHandler(async (_req, res) => {
      const creds = getPlaidCreds()
      if (!creds) {
        res.status(400).json({ error: 'Add your Plaid client ID and secret in Settings first.' })
        return
      }
      const linkToken = await plaid.createLinkToken(creds, 'devicehub-user')
      res.json({ linkToken })
    })
  )
  api.post(
    '/plaid/exchange',
    asyncHandler(async (req, res) => {
      const creds = getPlaidCreds()
      if (!creds) {
        res.status(400).json({ error: 'Add your Plaid client ID and secret in Settings first.' })
        return
      }
      const { accessToken, itemId } = await plaid.exchangePublicToken(creds, req.body.publicToken)
      plaidRepo.saveItem(itemId, accessToken, req.body.institutionName ?? null)
      res.json({ ok: true })
    })
  )
  api.post('/plaid/sync', asyncHandler(async (_req, res) => res.json(await syncAllPlaidItems())))
  api.get('/plaid/items', (_req, res) => res.json(plaidRepo.listItems()))
  api.get('/plaid/accounts', (_req, res) => res.json(plaidRepo.listCachedAccounts()))
  api.get('/plaid/transactions', (_req, res) => res.json(plaidRepo.listCachedTransactions()))
  api.delete(
    '/plaid/items/:id',
    asyncHandler(async (req, res) => {
      const itemId = String(req.params.id)
      const creds = getPlaidCreds()
      const items = plaidRepo.listItemsWithTokens()
      const item = items.find((i) => i.id === itemId)
      if (creds && item) {
        await plaid.removeItem(creds, item.accessToken).catch(() => {})
      }
      plaidRepo.removeItem(itemId)
      res.json({ ok: true })
    })
  )

  // Weather
  api.get('/weather/settings', (_req, res) => {
    res.json({ configured: !!getSecret(WEATHER_API_KEY), location: getSecret(WEATHER_LOCATION_KEY) ?? '' })
  })
  api.post('/weather/settings', (req, res) => {
    setSecret(WEATHER_API_KEY, req.body.apiKey)
    setSecret(WEATHER_LOCATION_KEY, req.body.location)
    res.json({ ok: true })
  })
  api.post(
    '/weather/sync',
    asyncHandler(async (_req, res) => {
      const apiKey = getSecret(WEATHER_API_KEY)
      const location = getSecret(WEATHER_LOCATION_KEY)
      if (!apiKey || !location) {
        res.status(400).json({ error: 'Add your weather API key and location in Settings first.' })
        return
      }
      const snapshot = await fetchWeather(apiKey, location)
      weatherRepo.saveSnapshot(snapshot)
      res.json(snapshot)
    })
  )
  api.get('/weather/cached', (_req, res) => res.json(weatherRepo.getCachedSnapshot()))

  // Spotify
  api.get('/spotify/status', (_req, res) => {
    const connected = !!getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
    const cached = spotifyRepo.getCachedSnapshot()
    res.json({ connected, displayName: cached?.profile.displayName ?? null })
  })
  api.post('/spotify/credentials', (req, res) => {
    setSecret(SPOTIFY_CLIENT_ID_KEY, req.body.clientId)
    setSecret(SPOTIFY_CLIENT_SECRET_KEY, req.body.clientSecret)
    res.json({ ok: true })
  })
  api.get('/spotify/connect', (_req, res) => {
    const creds = getSpotifyCreds()
    if (!creds) {
      res.status(400).json({ error: 'Add your Spotify client ID and secret in Settings first.' })
      return
    }
    const redirectUri = `${publicUrl}/api/spotify/callback`
    res.json({ url: buildSpotifyAuthUrl(creds.clientId, redirectUri) })
  })
  api.post('/spotify/disconnect', (_req, res) => {
    deleteSecret(SPOTIFY_REFRESH_TOKEN_KEY)
    res.json({ ok: true })
  })
  api.post(
    '/spotify/sync',
    asyncHandler(async (_req, res) => {
      const creds = getSpotifyCreds()
      const refreshToken = getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
      if (!creds || !refreshToken) {
        res.status(400).json({ error: 'Connect Spotify in Settings first.' })
        return
      }
      const { profile, recentlyPlayed } = await fetchSpotifySnapshot(creds, refreshToken)
      spotifyRepo.saveSnapshot(profile, recentlyPlayed)
      res.json({ profile, recentlyPlayed, syncedAt: new Date().toISOString() })
    })
  )
  api.get('/spotify/cached', (_req, res) => res.json(spotifyRepo.getCachedSnapshot()))
  api.get(
    '/spotify/playback',
    asyncHandler(async (_req, res) => {
      const creds = getSpotifyCreds()
      const refreshToken = getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
      if (!creds || !refreshToken) {
        res.status(400).json({ error: 'Connect Spotify in Settings first.' })
        return
      }
      res.json(await fetchPlaybackState(creds, refreshToken))
    })
  )
  api.post(
    '/spotify/playback/:action',
    asyncHandler(async (req, res) => {
      const creds = getSpotifyCreds()
      const refreshToken = getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
      if (!creds || !refreshToken) {
        res.status(400).json({ error: 'Connect Spotify in Settings first.' })
        return
      }
      await controlSpotifyPlayback(creds, refreshToken, req.params.action as SpotifyPlaybackAction)
      res.json({ ok: true })
    })
  )

  // Strava
  api.get('/strava/status', (_req, res) => {
    const connected = !!getSecret(STRAVA_REFRESH_TOKEN_KEY)
    const cached = stravaRepo.getCachedSnapshot()
    res.json({ connected, athleteName: cached?.athleteName ?? null })
  })
  api.post('/strava/credentials', (req, res) => {
    setSecret(STRAVA_CLIENT_ID_KEY, req.body.clientId)
    setSecret(STRAVA_CLIENT_SECRET_KEY, req.body.clientSecret)
    res.json({ ok: true })
  })
  api.get('/strava/connect', (_req, res) => {
    const creds = getStravaCreds()
    if (!creds) {
      res.status(400).json({ error: 'Add your Strava client ID and secret in Settings first.' })
      return
    }
    const redirectUri = `${publicUrl}/api/strava/callback`
    res.json({ url: buildStravaAuthUrl(creds.clientId, redirectUri) })
  })
  api.post('/strava/disconnect', (_req, res) => {
    deleteSecret(STRAVA_REFRESH_TOKEN_KEY)
    res.json({ ok: true })
  })
  api.post(
    '/strava/sync',
    asyncHandler(async (_req, res) => {
      const creds = getStravaCreds()
      const refreshToken = getSecret(STRAVA_REFRESH_TOKEN_KEY)
      if (!creds || !refreshToken) {
        res.status(400).json({ error: 'Connect Strava in Settings first.' })
        return
      }
      const result = await fetchStravaSnapshot(creds, refreshToken)
      setSecret(STRAVA_REFRESH_TOKEN_KEY, result.refreshToken)
      stravaRepo.saveSnapshot(result.athleteName, result.activities)
      res.json({ athleteName: result.athleteName, activities: result.activities, syncedAt: new Date().toISOString() })
    })
  )
  api.get('/strava/cached', (_req, res) => res.json(stravaRepo.getCachedSnapshot()))
  api.post(
    '/strava/activities',
    asyncHandler(async (req, res) => {
      const creds = getStravaCreds()
      const refreshToken = getSecret(STRAVA_REFRESH_TOKEN_KEY)
      if (!creds || !refreshToken) {
        res.status(400).json({ error: 'Connect Strava in Settings first.' })
        return
      }
      const created = await createManualActivity(creds, refreshToken, req.body as NewStravaActivity)
      setSecret(STRAVA_REFRESH_TOKEN_KEY, created.refreshToken)
      const result = await fetchStravaSnapshot(creds, created.refreshToken)
      setSecret(STRAVA_REFRESH_TOKEN_KEY, result.refreshToken)
      stravaRepo.saveSnapshot(result.athleteName, result.activities)
      res.json({ athleteName: result.athleteName, activities: result.activities, syncedAt: new Date().toISOString() })
    })
  )

  // Microsoft (Outlook + Microsoft 365)
  api.get('/microsoft/status', (_req, res) => {
    const connected = !!getSecret(MICROSOFT_REFRESH_TOKEN_KEY)
    const cached = microsoftRepo.getCachedSnapshot()
    res.json({ connected, displayName: cached?.displayName ?? null })
  })
  api.post('/microsoft/credentials', (req, res) => {
    setSecret(MICROSOFT_CLIENT_ID_KEY, req.body.clientId)
    setSecret(MICROSOFT_CLIENT_SECRET_KEY, req.body.clientSecret)
    res.json({ ok: true })
  })
  api.get('/microsoft/connect', (_req, res) => {
    const creds = getMicrosoftCreds()
    if (!creds) {
      res.status(400).json({ error: 'Add your Microsoft client ID and secret in Settings first.' })
      return
    }
    const redirectUri = `${publicUrl}/api/microsoft/callback`
    res.json({ url: buildMicrosoftAuthUrl(creds.clientId, redirectUri) })
  })
  api.post('/microsoft/disconnect', (_req, res) => {
    deleteSecret(MICROSOFT_REFRESH_TOKEN_KEY)
    res.json({ ok: true })
  })
  api.post(
    '/microsoft/sync',
    asyncHandler(async (_req, res) => {
      const creds = getMicrosoftCreds()
      const refreshToken = getSecret(MICROSOFT_REFRESH_TOKEN_KEY)
      if (!creds || !refreshToken) {
        res.status(400).json({ error: 'Connect Microsoft in Settings first.' })
        return
      }
      const snapshot = await fetchMicrosoftSnapshot(creds, refreshToken)
      microsoftRepo.saveSnapshot(snapshot)
      res.json({ ...snapshot, syncedAt: new Date().toISOString() })
    })
  )
  api.get('/microsoft/cached', (_req, res) => res.json(microsoftRepo.getCachedSnapshot()))

  // LinkedIn (limited to basic sign-in profile only)
  api.get('/linkedin/profile', (_req, res) => res.json(linkedinRepo.getProfile()))
  api.post('/linkedin/credentials', (req, res) => {
    setSecret(LINKEDIN_CLIENT_ID_KEY, req.body.clientId)
    setSecret(LINKEDIN_CLIENT_SECRET_KEY, req.body.clientSecret)
    res.json({ ok: true })
  })
  api.get('/linkedin/connect', (_req, res) => {
    const creds = getLinkedInCreds()
    if (!creds) {
      res.status(400).json({ error: 'Add your LinkedIn client ID and secret in Settings first.' })
      return
    }
    const redirectUri = `${publicUrl}/api/linkedin/callback`
    res.json({ url: buildLinkedInAuthUrl(creds.clientId, redirectUri) })
  })
  api.post('/linkedin/disconnect', (_req, res) => {
    linkedinRepo.clearProfile()
    res.json({ ok: true })
  })

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

  // Spotify's redirect lands here after consent — same reasoning as the
  // Google callback above: outside requireAuth since it's a top-level
  // browser redirect from Spotify, not an XHR from our own frontend.
  app.get('/api/spotify/callback', (req, res) => {
    const code = String(req.query.code ?? '')
    const error = req.query.error
    const redirectUri = `${publicUrl}/api/spotify/callback`

    if (error || !code) {
      res.redirect('/settings?spotify=error')
      return
    }

    const creds = getSpotifyCreds()
    if (!creds) {
      res.redirect('/settings?spotify=error')
      return
    }

    exchangeSpotifyCode(creds, redirectUri, code)
      .then(async (token) => {
        if (!token.refreshToken) throw new Error('Spotify did not return a refresh token.')
        setSecret(SPOTIFY_REFRESH_TOKEN_KEY, token.refreshToken)
        const { profile, recentlyPlayed } = await fetchSpotifySnapshot(creds, token.refreshToken)
        spotifyRepo.saveSnapshot(profile, recentlyPlayed)
        res.redirect('/settings?spotify=connected')
      })
      .catch(() => res.redirect('/settings?spotify=error'))
  })

  // Strava's redirect lands here after consent — same reasoning as above.
  app.get('/api/strava/callback', (req, res) => {
    const code = String(req.query.code ?? '')
    const error = req.query.error
    const redirectUri = `${publicUrl}/api/strava/callback`

    if (error || !code) {
      res.redirect('/settings?strava=error')
      return
    }

    const creds = getStravaCreds()
    if (!creds) {
      res.redirect('/settings?strava=error')
      return
    }

    exchangeStravaCode(creds, redirectUri, code)
      .then(async (token) => {
        if (!token.refreshToken) throw new Error('Strava did not return a refresh token.')
        const result = await fetchStravaSnapshot(creds, token.refreshToken)
        setSecret(STRAVA_REFRESH_TOKEN_KEY, result.refreshToken)
        stravaRepo.saveSnapshot(result.athleteName, result.activities)
        res.redirect('/settings?strava=connected')
      })
      .catch(() => res.redirect('/settings?strava=error'))
  })

  // Microsoft's redirect lands here after consent — same reasoning as above.
  app.get('/api/microsoft/callback', (req, res) => {
    const code = String(req.query.code ?? '')
    const error = req.query.error
    const redirectUri = `${publicUrl}/api/microsoft/callback`

    if (error || !code) {
      res.redirect('/settings?microsoft=error')
      return
    }

    const creds = getMicrosoftCreds()
    if (!creds) {
      res.redirect('/settings?microsoft=error')
      return
    }

    exchangeMicrosoftCode(creds, redirectUri, code)
      .then(async (token) => {
        if (!token.refreshToken) throw new Error('Microsoft did not return a refresh token.')
        setSecret(MICROSOFT_REFRESH_TOKEN_KEY, token.refreshToken)
        const snapshot = await fetchMicrosoftSnapshot(creds, token.refreshToken)
        microsoftRepo.saveSnapshot(snapshot)
        res.redirect('/settings?microsoft=connected')
      })
      .catch(() => res.redirect('/settings?microsoft=error'))
  })

  // LinkedIn's redirect lands here after consent — same reasoning as above.
  app.get('/api/linkedin/callback', (req, res) => {
    const code = String(req.query.code ?? '')
    const error = req.query.error
    const redirectUri = `${publicUrl}/api/linkedin/callback`

    if (error || !code) {
      res.redirect('/settings?linkedin=error')
      return
    }

    const creds = getLinkedInCreds()
    if (!creds) {
      res.redirect('/settings?linkedin=error')
      return
    }

    exchangeLinkedInCode(creds, redirectUri, code)
      .then(async (token) => {
        const profile = await fetchLinkedInProfile(token.accessToken)
        linkedinRepo.saveProfile(profile)
        res.redirect('/settings?linkedin=connected')
      })
      .catch(() => res.redirect('/settings?linkedin=error'))
  })

  app.use('/api', api)
}
