import type { DeviceHubApi } from '../shared/types'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('devicehub:unauthorized'))
    throw new Error('Not authenticated')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as { error?: string })
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function query(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]
  if (entries.length === 0) return ''
  return `?${new URLSearchParams(entries).toString()}`
}

async function requestNotificationPermissionIfNeeded(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/** Polls the server for reminders that fired since `sinceIso` — used only in
 * browser mode, where there's no background process to show native
 * notifications the way the Electron scheduler does. Not part of the shared
 * DeviceHubApi surface since Electron doesn't need it. */
export async function pollFiredReminders(sinceIso: string): Promise<{ id: string; title: string; notes: string | null }[]> {
  return request('GET', `/reminders/fired-since${query({ since: sinceIso })}`)
}

export function createHttpClient(): DeviceHubApi {
  return {
    reminders: {
      list: () => request('GET', '/reminders'),
      create: (input) => request('POST', '/reminders', input),
      update: (id, updates) => request('PATCH', `/reminders/${id}`, updates),
      remove: (id) => request('DELETE', `/reminders/${id}`),
    },
    goals: {
      list: () => request('GET', '/goals'),
      create: (input) => request('POST', '/goals', input),
      update: (id, updates) => request('PATCH', `/goals/${id}`, updates),
      logProgress: (id, delta, note) => request('POST', `/goals/${id}/log`, { delta, note }),
      history: (id) => request('GET', `/goals/${id}/history`),
      remove: (id) => request('DELETE', `/goals/${id}`),
    },
    budget: {
      listCategories: () => request('GET', '/budget/categories'),
      createCategory: (input) => request('POST', '/budget/categories', input),
      removeCategory: (id) => request('DELETE', `/budget/categories/${id}`),
      listTransactions: (month) => request('GET', `/budget/transactions${query({ month })}`),
      createTransaction: (input) => request('POST', '/budget/transactions', input),
      removeTransaction: (id) => request('DELETE', `/budget/transactions/${id}`),
      summary: (month) => request('GET', `/budget/summary${query({ month })}`),
    },
    canvas: {
      getSettings: () => request('GET', '/canvas/settings'),
      saveSettings: (settings) => request('POST', '/canvas/settings', settings),
      sync: () => request('POST', '/canvas/sync'),
      listCached: () => request('GET', '/canvas/cached'),
      setLocalCompletion: (id, completed) => request('POST', `/canvas/assignments/${id}/complete`, { completed }),
    },
    notifications: {
      getGoogleAuthStatus: () => request('GET', '/notifications/google-status'),
      saveGoogleCredentials: (clientId, clientSecret) =>
        request('POST', '/notifications/google-credentials', { clientId, clientSecret }),
      connectGoogle: async () => {
        const { url } = await request<{ url: string }>('GET', '/google/connect')
        window.location.href = url
        // The page is navigating away to Google's consent screen; this
        // promise deliberately never resolves in the browser build. The
        // Settings page picks the result back up from the redirect it lands
        // on (?google=connected / ?google=error) after the round trip.
        return new Promise(() => {})
      },
      disconnectGoogle: () => request('POST', '/notifications/disconnect-google'),
      getDigest: () => request('GET', '/notifications/digest'),
      refreshDigest: () => request('POST', '/notifications/refresh-digest'),
      markAsRead: (id) => request('POST', `/notifications/mark-read/${id}`),
    },
    calendar: {
      getEvents: () => request('GET', '/calendar/events'),
      refreshEvents: () => request('POST', '/calendar/refresh'),
      createEvent: (input) => request('POST', '/calendar/events', input),
      deleteEvent: (id) => request('DELETE', `/calendar/events/${id}`),
    },
    fitness: {
      listFood: (date) => request('GET', `/fitness/food${query({ date })}`),
      createFood: (input) => request('POST', '/fitness/food', input),
      removeFood: (id) => request('DELETE', `/fitness/food/${id}`),
      listExercise: (date) => request('GET', `/fitness/exercise${query({ date })}`),
      createExercise: (input) => request('POST', '/fitness/exercise', input),
      removeExercise: (id) => request('DELETE', `/fitness/exercise/${id}`),
      dailySummary: (date) => request('GET', `/fitness/daily-summary${query({ date })}`),
      getCalorieTarget: () => request('GET', '/fitness/calorie-target'),
      setCalorieTarget: (target) => request('POST', '/fitness/calorie-target', { target }),
    },
    assistant: {
      getStatus: () => request('GET', '/assistant/status'),
      saveApiKey: (provider, apiKey) => request('POST', '/assistant/api-key', { provider, apiKey }),
      setProvider: (provider) => request('POST', '/assistant/provider', { provider }),
      getHistory: () => request('GET', '/assistant/history'),
      sendMessage: (content) => request('POST', '/assistant/message', { content }),
      clearHistory: () => request('DELETE', '/assistant/history'),
    },
    oura: {
      getStatus: () => request('GET', '/oura/status'),
      saveToken: (token) => request('POST', '/oura/token', { token }),
      sync: () => request('POST', '/oura/sync'),
      listCached: () => request('GET', '/oura/cached'),
    },
    profile: {
      getName: () => request('GET', '/profile/name'),
      setName: (name) => request('POST', '/profile/name', { name }),
    },
    weather: {
      getSettings: () => request('GET', '/weather/settings'),
      saveSettings: (input) => request('POST', '/weather/settings', input),
      sync: () => request('POST', '/weather/sync'),
      getCached: () => request('GET', '/weather/cached'),
    },
    spotify: {
      getStatus: () => request('GET', '/spotify/status'),
      saveCredentials: (clientId, clientSecret) => request('POST', '/spotify/credentials', { clientId, clientSecret }),
      connect: async () => {
        const { url } = await request<{ url: string }>('GET', '/spotify/connect')
        window.location.href = url
        return new Promise(() => {})
      },
      disconnect: () => request('POST', '/spotify/disconnect'),
      sync: () => request('POST', '/spotify/sync'),
      getCached: () => request('GET', '/spotify/cached'),
      getPlaybackState: () => request('GET', '/spotify/playback'),
      controlPlayback: (action) => request('POST', `/spotify/playback/${action}`),
    },
    strava: {
      getStatus: () => request('GET', '/strava/status'),
      saveCredentials: (clientId, clientSecret) => request('POST', '/strava/credentials', { clientId, clientSecret }),
      connect: async () => {
        const { url } = await request<{ url: string }>('GET', '/strava/connect')
        window.location.href = url
        return new Promise(() => {})
      },
      disconnect: () => request('POST', '/strava/disconnect'),
      sync: () => request('POST', '/strava/sync'),
      getCached: () => request('GET', '/strava/cached'),
      createActivity: (input) => request('POST', '/strava/activities', input),
    },
    microsoft: {
      getStatus: () => request('GET', '/microsoft/status'),
      saveCredentials: (clientId, clientSecret) => request('POST', '/microsoft/credentials', { clientId, clientSecret }),
      connect: async () => {
        const { url } = await request<{ url: string }>('GET', '/microsoft/connect')
        window.location.href = url
        return new Promise(() => {})
      },
      disconnect: () => request('POST', '/microsoft/disconnect'),
      sync: () => request('POST', '/microsoft/sync'),
      getCached: () => request('GET', '/microsoft/cached'),
    },
    linkedin: {
      getProfile: () => request('GET', '/linkedin/profile'),
      saveCredentials: (clientId, clientSecret) => request('POST', '/linkedin/credentials', { clientId, clientSecret }),
      connect: async () => {
        const { url } = await request<{ url: string }>('GET', '/linkedin/connect')
        window.location.href = url
        return new Promise(() => {})
      },
      disconnect: () => request('POST', '/linkedin/disconnect'),
    },
    plaid: {
      getSettings: () => request('GET', '/plaid/settings'),
      saveSettings: (input) => request('POST', '/plaid/settings', input),
      createLinkToken: () => request('POST', '/plaid/link-token'),
      exchangePublicToken: (publicToken, institutionName) =>
        request('POST', '/plaid/exchange', { publicToken, institutionName }),
      sync: () => request('POST', '/plaid/sync'),
      listItems: () => request('GET', '/plaid/items'),
      listAccounts: () => request('GET', '/plaid/accounts'),
      listTransactions: () => request('GET', '/plaid/transactions'),
      removeItem: (itemId) => request('DELETE', `/plaid/items/${itemId}`),
    },
    system: {
      notify: async (title, body) => {
        if (await requestNotificationPermissionIfNeeded()) {
          new Notification(title, { body })
        }
      },
    },
  }
}
