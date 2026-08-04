import { ipcMain, Notification } from 'electron'
import * as reminders from '../core/db/repos/reminders'
import * as goals from '../core/db/repos/goals'
import * as budget from '../core/db/repos/budget'
import * as canvasRepo from '../core/db/repos/canvas'
import * as calendarRepo from '../core/db/repos/calendar'
import * as fitness from '../core/db/repos/fitness'
import * as chat from '../core/db/repos/chat'
import * as ouraRepo from '../core/db/repos/oura'
import * as plaidRepo from '../core/db/repos/plaid'
import * as simplefinRepo from '../core/db/repos/simplefin'
import * as weatherRepo from '../core/db/repos/weather'
import * as spotifyRepo from '../core/db/repos/spotify'
import * as stravaRepo from '../core/db/repos/strava'
import * as microsoftRepo from '../core/db/repos/microsoft'
import * as linkedinRepo from '../core/db/repos/linkedin'
import { getSecret, setSecret, deleteSecret } from '../core/db/repos/settings'
import { fetchAssignments } from '../core/integrations/canvas'
import { fetchUnreadDigest, markMessageAsRead } from '../core/integrations/gmail'
import { fetchUpcomingEvents, createCalendarEvent, deleteCalendarEvent } from '../core/integrations/calendar'
import { runOAuthFlow } from './integrations/googleAuth'
import { runAssistantTurn } from '../core/integrations/assistant'
import { runManagedAgentTurn } from '../core/integrations/managedAgent'
import { fetchOuraSummary } from '../core/integrations/oura'
import * as plaid from '../core/integrations/plaid'
import * as simplefin from '../core/integrations/simplefin'
import { autoCategorizePlaidTransactions, autoCategorizeSimplefinTransactions } from '../core/integrations/budgetAutoSync'
import type { PlaidEnvironment } from '../core/integrations/plaid'
import { fetchWeather } from '../core/integrations/weather'
import {
  fetchSpotifySnapshot,
  fetchPlaybackState,
  controlSpotifyPlayback,
  type SpotifyCreds,
  type SpotifyPlaybackAction,
} from '../core/integrations/spotify'
import { connectSpotify } from './integrations/spotifyAuth'
import {
  fetchStravaSnapshot,
  createManualActivity,
  type StravaCreds,
  type NewStravaActivity,
} from '../core/integrations/strava'
import { connectStrava } from './integrations/stravaAuth'
import { fetchMicrosoftSnapshot, type MicrosoftCreds } from '../core/integrations/microsoft'
import { connectMicrosoft } from './integrations/microsoftAuth'
import type { LinkedInCreds } from '../core/integrations/linkedin'
import { connectLinkedIn } from './integrations/linkedinAuth'
import type { CanvasSettings, NotificationDigest, NewCalendarEvent, AssistantProvider } from '../src/shared/types'

const CANVAS_DOMAIN_KEY = 'canvas.domain'
const CANVAS_TOKEN_KEY = 'canvas.token'
const GOOGLE_CLIENT_ID_KEY = 'google.clientId'
const GOOGLE_CLIENT_SECRET_KEY = 'google.clientSecret'
const GOOGLE_REFRESH_TOKEN_KEY = 'google.refreshToken'
const GOOGLE_EMAIL_KEY = 'google.email'
const LAST_NOTIFICATION_CHECK_KEY = 'notifications.lastCheck'
const CALORIE_TARGET_KEY = 'fitness.calorieTarget'
const ANTHROPIC_API_KEY = 'assistant.anthropicApiKey'
const OPENAI_API_KEY = 'assistant.openaiApiKey'
const ASSISTANT_PROVIDER_KEY = 'assistant.provider'
const MANAGED_AGENT_ID_KEY = 'assistant.managedAgentId'
const MANAGED_AGENT_ENV_KEY = 'assistant.managedAgentEnvironmentId'
const MANAGED_AGENT_SESSION_KEY = 'assistant.managedAgentSessionId'
const OURA_TOKEN_KEY = 'oura.token'
const PROFILE_NAME_KEY = 'profile.name'
const PLAID_CLIENT_ID_KEY = 'plaid.clientId'
const PLAID_SECRET_KEY = 'plaid.secret'
const PLAID_ENV_KEY = 'plaid.environment'
const SIMPLEFIN_ACCESS_URL_KEY = 'simplefin.accessUrl'
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
  autoCategorizePlaidTransactions()
  return { accounts: plaidRepo.listCachedAccounts(), transactions: plaidRepo.listCachedTransactions() }
}

async function syncSimplefin() {
  const accessUrl = getSecret(SIMPLEFIN_ACCESS_URL_KEY)
  if (!accessUrl) throw new Error('Connect SimpleFIN in Settings first.')
  const { accounts, transactions } = await simplefin.fetchAccounts(accessUrl)
  simplefinRepo.replaceCachedAccounts(accounts)
  simplefinRepo.replaceCachedTransactions(transactions)
  autoCategorizeSimplefinTransactions()
  return { accounts: simplefinRepo.listCachedAccounts(), transactions: simplefinRepo.listCachedTransactions() }
}

function getAssistantProvider(): AssistantProvider {
  return (getSecret(ASSISTANT_PROVIDER_KEY) as AssistantProvider | null) ?? 'anthropic'
}

function parseAssistantProvider(value: unknown): AssistantProvider {
  if (value === 'openai') return 'openai'
  if (value === 'managed-agent') return 'managed-agent'
  return 'anthropic'
}

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
  ipcMain.handle('budget:updateCategory', (_e, id, updates) => budget.updateCategory(id, updates))
  ipcMain.handle('budget:removeCategory', (_e, id) => budget.removeCategory(id))
  ipcMain.handle('budget:listTransactions', (_e, month) => budget.listTransactions(month))
  ipcMain.handle('budget:createTransaction', (_e, input) => budget.createTransaction(input))
  ipcMain.handle('budget:updateTransactionCategory', (_e, id, categoryId) => budget.updateTransactionCategory(id, categoryId))
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
    return canvasRepo.listCachedAssignments()
  })
  ipcMain.handle('canvas:listCached', () => canvasRepo.listCachedAssignments())
  ipcMain.handle('canvas:setLocalCompletion', (_e, id: string, completed: boolean) => {
    canvasRepo.setLocalCompletion(id, completed)
    return canvasRepo.listCachedAssignments()
  })

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
  ipcMain.handle('notifications:markAsRead', async (_e, id: string) => {
    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
    if (!clientId || !clientSecret || !refreshToken) throw new Error('Connect Google in Settings first.')
    await markMessageAsRead(clientId, clientSecret, refreshToken, id)
  })

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
  ipcMain.handle('calendar:createEvent', async (_e, input: NewCalendarEvent) => {
    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
    if (!clientId || !clientSecret || !refreshToken) throw new Error('Connect Google in Settings first.')
    await createCalendarEvent(clientId, clientSecret, refreshToken, input)
    return syncCalendar()
  })
  ipcMain.handle('calendar:deleteEvent', async (_e, id: string) => {
    const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
    const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
    const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
    if (!clientId || !clientSecret || !refreshToken) throw new Error('Connect Google in Settings first.')
    await deleteCalendarEvent(clientId, clientSecret, refreshToken, id)
    return syncCalendar()
  })

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
  ipcMain.handle('assistant:getStatus', () => {
    const provider = getAssistantProvider()
    const anthropicConfigured = !!getSecret(ANTHROPIC_API_KEY)
    const openaiConfigured = !!getSecret(OPENAI_API_KEY)
    const managedAgentId = getSecret(MANAGED_AGENT_ID_KEY)
    const managedAgentEnvironmentId = getSecret(MANAGED_AGENT_ENV_KEY)
    const managedAgentConfigured = anthropicConfigured && !!managedAgentId && !!managedAgentEnvironmentId
    return {
      provider,
      anthropicConfigured,
      openaiConfigured,
      managedAgentConfigured,
      managedAgentId,
      managedAgentEnvironmentId,
      configured:
        provider === 'openai' ? openaiConfigured : provider === 'managed-agent' ? managedAgentConfigured : anthropicConfigured,
    }
  })
  ipcMain.handle('assistant:saveApiKey', (_e, provider: AssistantProvider, apiKey: string) => {
    setSecret(parseAssistantProvider(provider) === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY, apiKey)
  })
  ipcMain.handle('assistant:setProvider', (_e, provider: AssistantProvider) => {
    setSecret(ASSISTANT_PROVIDER_KEY, parseAssistantProvider(provider))
  })
  ipcMain.handle('assistant:saveManagedAgentConfig', (_e, agentId: string, environmentId: string) => {
    const trimmedAgentId = (agentId ?? '').trim()
    const trimmedEnvironmentId = (environmentId ?? '').trim()
    if (!trimmedAgentId || !trimmedEnvironmentId) {
      throw new Error('Agent ID and Environment ID are both required.')
    }
    setSecret(MANAGED_AGENT_ID_KEY, trimmedAgentId)
    setSecret(MANAGED_AGENT_ENV_KEY, trimmedEnvironmentId)
    deleteSecret(MANAGED_AGENT_SESSION_KEY)
  })
  ipcMain.handle('assistant:getHistory', () => chat.listMessages())
  ipcMain.handle('assistant:sendMessage', async (_e, content: string) => {
    const provider = getAssistantProvider()

    if (provider === 'managed-agent') {
      const apiKey = getSecret(ANTHROPIC_API_KEY)
      const agentId = getSecret(MANAGED_AGENT_ID_KEY)
      const environmentId = getSecret(MANAGED_AGENT_ENV_KEY)
      if (!apiKey || !agentId || !environmentId) {
        throw new Error('Add your Anthropic API key and Managed Agent ID/Environment ID in Settings to enable this agent.')
      }
      chat.addMessage('user', content)
      const sessionId = getSecret(MANAGED_AGENT_SESSION_KEY)
      const result = await runManagedAgentTurn({ apiKey, agentId, environmentId, sessionId }, content)
      setSecret(MANAGED_AGENT_SESSION_KEY, result.sessionId)
      chat.addMessage('assistant', result.reply)
      return chat.listMessages()
    }

    const apiKey = getSecret(provider === 'openai' ? OPENAI_API_KEY : ANTHROPIC_API_KEY)
    if (!apiKey) {
      throw new Error(`Add your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key in Settings to enable the assistant.`)
    }
    const history = chat.listMessages()
    chat.addMessage('user', content)
    const reply = await runAssistantTurn(provider, apiKey, history, content)
    chat.addMessage('assistant', reply)
    return chat.listMessages()
  })
  ipcMain.handle('assistant:clearHistory', () => {
    chat.clearMessages()
    deleteSecret(MANAGED_AGENT_SESSION_KEY)
  })

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

  // Profile
  ipcMain.handle('profile:getName', () => getSecret(PROFILE_NAME_KEY))
  ipcMain.handle('profile:setName', (_e, name: string) => {
    setSecret(PROFILE_NAME_KEY, name)
  })

  // Plaid
  ipcMain.handle('plaid:getSettings', () => {
    const creds = getPlaidCreds()
    return { configured: !!creds, environment: creds?.environment ?? 'sandbox' }
  })
  ipcMain.handle('plaid:saveSettings', (_e, input: { clientId: string; secret: string; environment: string }) => {
    setSecret(PLAID_CLIENT_ID_KEY, input.clientId)
    setSecret(PLAID_SECRET_KEY, input.secret)
    setSecret(PLAID_ENV_KEY, input.environment)
  })
  ipcMain.handle('plaid:createLinkToken', async () => {
    const creds = getPlaidCreds()
    if (!creds) throw new Error('Add your Plaid client ID and secret in Settings first.')
    const linkToken = await plaid.createLinkToken(creds, 'devicehub-user')
    return { linkToken }
  })
  ipcMain.handle('plaid:exchangePublicToken', async (_e, publicToken: string, institutionName: string | null) => {
    const creds = getPlaidCreds()
    if (!creds) throw new Error('Add your Plaid client ID and secret in Settings first.')
    const { accessToken, itemId } = await plaid.exchangePublicToken(creds, publicToken)
    plaidRepo.saveItem(itemId, accessToken, institutionName)
  })
  ipcMain.handle('plaid:sync', () => syncAllPlaidItems())
  ipcMain.handle('plaid:listItems', () => plaidRepo.listItems())
  ipcMain.handle('plaid:listAccounts', () => plaidRepo.listCachedAccounts())
  ipcMain.handle('plaid:listTransactions', () => plaidRepo.listCachedTransactions())
  ipcMain.handle('plaid:removeItem', async (_e, itemId: string) => {
    const creds = getPlaidCreds()
    const items = plaidRepo.listItemsWithTokens()
    const item = items.find((i) => i.id === itemId)
    if (creds && item) {
      await plaid.removeItem(creds, item.accessToken).catch(() => {})
    }
    plaidRepo.removeItem(itemId)
  })

  // SimpleFIN
  ipcMain.handle('simplefin:getStatus', () => ({ configured: !!getSecret(SIMPLEFIN_ACCESS_URL_KEY) }))
  ipcMain.handle('simplefin:saveSetupToken', async (_e, setupToken: string) => {
    const trimmed = (setupToken ?? '').trim()
    if (!trimmed) throw new Error('Paste a setup token first.')
    const accessUrl = await simplefin.claimSetupToken(trimmed)
    setSecret(SIMPLEFIN_ACCESS_URL_KEY, accessUrl)
  })
  ipcMain.handle('simplefin:disconnect', () => {
    deleteSecret(SIMPLEFIN_ACCESS_URL_KEY)
    simplefinRepo.clearAll()
  })
  ipcMain.handle('simplefin:sync', () => syncSimplefin())
  ipcMain.handle('simplefin:listAccounts', () => simplefinRepo.listCachedAccounts())
  ipcMain.handle('simplefin:listTransactions', () => simplefinRepo.listCachedTransactions())

  // Weather
  ipcMain.handle('weather:getSettings', () => ({
    configured: !!getSecret(WEATHER_API_KEY),
    location: getSecret(WEATHER_LOCATION_KEY) ?? '',
  }))
  ipcMain.handle('weather:saveSettings', (_e, input: { apiKey: string; location: string }) => {
    setSecret(WEATHER_API_KEY, input.apiKey)
    setSecret(WEATHER_LOCATION_KEY, input.location)
  })
  ipcMain.handle('weather:sync', async () => {
    const apiKey = getSecret(WEATHER_API_KEY)
    const location = getSecret(WEATHER_LOCATION_KEY)
    if (!apiKey || !location) throw new Error('Add your weather API key and location in Settings first.')
    const snapshot = await fetchWeather(apiKey, location)
    weatherRepo.saveSnapshot(snapshot)
    return snapshot
  })
  ipcMain.handle('weather:getCached', () => weatherRepo.getCachedSnapshot())

  // Spotify
  ipcMain.handle('spotify:getStatus', () => {
    const connected = !!getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
    const cached = spotifyRepo.getCachedSnapshot()
    return { connected, displayName: cached?.profile.displayName ?? null }
  })
  ipcMain.handle('spotify:saveCredentials', (_e, clientId: string, clientSecret: string) => {
    setSecret(SPOTIFY_CLIENT_ID_KEY, clientId)
    setSecret(SPOTIFY_CLIENT_SECRET_KEY, clientSecret)
  })
  ipcMain.handle('spotify:connect', async () => {
    const creds = getSpotifyCreds()
    if (!creds) throw new Error('Add your Spotify client ID and secret in Settings first.')
    const { refreshToken } = await connectSpotify(creds)
    setSecret(SPOTIFY_REFRESH_TOKEN_KEY, refreshToken)
    const { profile, recentlyPlayed } = await fetchSpotifySnapshot(creds, refreshToken)
    spotifyRepo.saveSnapshot(profile, recentlyPlayed)
    return { connected: true, displayName: profile.displayName }
  })
  ipcMain.handle('spotify:disconnect', () => {
    deleteSecret(SPOTIFY_REFRESH_TOKEN_KEY)
  })
  ipcMain.handle('spotify:sync', async () => {
    const creds = getSpotifyCreds()
    const refreshToken = getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
    if (!creds || !refreshToken) throw new Error('Connect Spotify in Settings first.')
    const { profile, recentlyPlayed } = await fetchSpotifySnapshot(creds, refreshToken)
    spotifyRepo.saveSnapshot(profile, recentlyPlayed)
    return { profile, recentlyPlayed, syncedAt: new Date().toISOString() }
  })
  ipcMain.handle('spotify:getCached', () => spotifyRepo.getCachedSnapshot())
  ipcMain.handle('spotify:getPlaybackState', async () => {
    const creds = getSpotifyCreds()
    const refreshToken = getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
    if (!creds || !refreshToken) throw new Error('Connect Spotify in Settings first.')
    return fetchPlaybackState(creds, refreshToken)
  })
  ipcMain.handle('spotify:controlPlayback', async (_e, action: SpotifyPlaybackAction) => {
    const creds = getSpotifyCreds()
    const refreshToken = getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
    if (!creds || !refreshToken) throw new Error('Connect Spotify in Settings first.')
    await controlSpotifyPlayback(creds, refreshToken, action)
  })

  // Strava
  ipcMain.handle('strava:getStatus', () => {
    const connected = !!getSecret(STRAVA_REFRESH_TOKEN_KEY)
    const cached = stravaRepo.getCachedSnapshot()
    return { connected, athleteName: cached?.athleteName ?? null }
  })
  ipcMain.handle('strava:saveCredentials', (_e, clientId: string, clientSecret: string) => {
    setSecret(STRAVA_CLIENT_ID_KEY, clientId)
    setSecret(STRAVA_CLIENT_SECRET_KEY, clientSecret)
  })
  ipcMain.handle('strava:connect', async () => {
    const creds = getStravaCreds()
    if (!creds) throw new Error('Add your Strava client ID and secret in Settings first.')
    const { refreshToken } = await connectStrava(creds)
    const result = await fetchStravaSnapshot(creds, refreshToken)
    setSecret(STRAVA_REFRESH_TOKEN_KEY, result.refreshToken)
    stravaRepo.saveSnapshot(result.athleteName, result.activities)
    return { connected: true, athleteName: result.athleteName }
  })
  ipcMain.handle('strava:disconnect', () => {
    deleteSecret(STRAVA_REFRESH_TOKEN_KEY)
  })
  ipcMain.handle('strava:sync', async () => {
    const creds = getStravaCreds()
    const refreshToken = getSecret(STRAVA_REFRESH_TOKEN_KEY)
    if (!creds || !refreshToken) throw new Error('Connect Strava in Settings first.')
    const result = await fetchStravaSnapshot(creds, refreshToken)
    setSecret(STRAVA_REFRESH_TOKEN_KEY, result.refreshToken)
    stravaRepo.saveSnapshot(result.athleteName, result.activities)
    return { athleteName: result.athleteName, activities: result.activities, syncedAt: new Date().toISOString() }
  })
  ipcMain.handle('strava:getCached', () => stravaRepo.getCachedSnapshot())
  ipcMain.handle('strava:createActivity', async (_e, input: NewStravaActivity) => {
    const creds = getStravaCreds()
    const refreshToken = getSecret(STRAVA_REFRESH_TOKEN_KEY)
    if (!creds || !refreshToken) throw new Error('Connect Strava in Settings first.')
    const created = await createManualActivity(creds, refreshToken, input)
    setSecret(STRAVA_REFRESH_TOKEN_KEY, created.refreshToken)
    const result = await fetchStravaSnapshot(creds, created.refreshToken)
    setSecret(STRAVA_REFRESH_TOKEN_KEY, result.refreshToken)
    stravaRepo.saveSnapshot(result.athleteName, result.activities)
    return { athleteName: result.athleteName, activities: result.activities, syncedAt: new Date().toISOString() }
  })

  // Microsoft (Outlook + Microsoft 365)
  ipcMain.handle('microsoft:getStatus', () => {
    const connected = !!getSecret(MICROSOFT_REFRESH_TOKEN_KEY)
    const cached = microsoftRepo.getCachedSnapshot()
    return { connected, displayName: cached?.displayName ?? null }
  })
  ipcMain.handle('microsoft:saveCredentials', (_e, clientId: string, clientSecret: string) => {
    setSecret(MICROSOFT_CLIENT_ID_KEY, clientId)
    setSecret(MICROSOFT_CLIENT_SECRET_KEY, clientSecret)
  })
  ipcMain.handle('microsoft:connect', async () => {
    const creds = getMicrosoftCreds()
    if (!creds) throw new Error('Add your Microsoft client ID and secret in Settings first.')
    const { refreshToken } = await connectMicrosoft(creds)
    setSecret(MICROSOFT_REFRESH_TOKEN_KEY, refreshToken)
    const snapshot = await fetchMicrosoftSnapshot(creds, refreshToken)
    microsoftRepo.saveSnapshot(snapshot)
    return { connected: true, displayName: snapshot.displayName }
  })
  ipcMain.handle('microsoft:disconnect', () => {
    deleteSecret(MICROSOFT_REFRESH_TOKEN_KEY)
  })
  ipcMain.handle('microsoft:sync', async () => {
    const creds = getMicrosoftCreds()
    const refreshToken = getSecret(MICROSOFT_REFRESH_TOKEN_KEY)
    if (!creds || !refreshToken) throw new Error('Connect Microsoft in Settings first.')
    const snapshot = await fetchMicrosoftSnapshot(creds, refreshToken)
    microsoftRepo.saveSnapshot(snapshot)
    return { ...snapshot, syncedAt: new Date().toISOString() }
  })
  ipcMain.handle('microsoft:getCached', () => microsoftRepo.getCachedSnapshot())

  // LinkedIn (limited to basic sign-in profile — no feed/network data is
  // available from LinkedIn's API without a restrictive partnership tier)
  ipcMain.handle('linkedin:getProfile', () => linkedinRepo.getProfile())
  ipcMain.handle('linkedin:saveCredentials', (_e, clientId: string, clientSecret: string) => {
    setSecret(LINKEDIN_CLIENT_ID_KEY, clientId)
    setSecret(LINKEDIN_CLIENT_SECRET_KEY, clientSecret)
  })
  ipcMain.handle('linkedin:connect', async () => {
    const creds = getLinkedInCreds()
    if (!creds) throw new Error('Add your LinkedIn client ID and secret in Settings first.')
    const profile = await connectLinkedIn(creds)
    linkedinRepo.saveProfile(profile)
    return linkedinRepo.getProfile()
  })
  ipcMain.handle('linkedin:disconnect', () => {
    linkedinRepo.clearProfile()
  })

  // System
  ipcMain.handle('system:notify', (_e, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })
}
