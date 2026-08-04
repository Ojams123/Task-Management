import type Anthropic from '@anthropic-ai/sdk'
import * as reminders from '../db/repos/reminders'
import * as goals from '../db/repos/goals'
import * as budget from '../db/repos/budget'
import * as fitness from '../db/repos/fitness'
import * as canvasRepo from '../db/repos/canvas'
import * as calendarRepo from '../db/repos/calendar'
import * as ouraRepo from '../db/repos/oura'
import * as plaidRepo from '../db/repos/plaid'
import * as simplefinRepo from '../db/repos/simplefin'
import * as weatherRepo from '../db/repos/weather'
import * as spotifyRepo from '../db/repos/spotify'
import * as stravaRepo from '../db/repos/strava'
import * as microsoftRepo from '../db/repos/microsoft'
import * as linkedinRepo from '../db/repos/linkedin'
import { getSecret } from '../db/repos/settings'
import { fetchUpcomingEvents, createCalendarEvent, deleteCalendarEvent } from './calendar'
import { fetchUnreadDigest, markMessageAsRead } from './gmail'
import { fetchWeather } from './weather'
import { controlSpotifyPlayback, type SpotifyCreds, type SpotifyPlaybackAction } from './spotify'
import { fetchStravaSnapshot, createManualActivity, type StravaCreds, type NewStravaActivity } from './strava'
import type { Reminder } from '../../src/shared/types'

const GOOGLE_CLIENT_ID_KEY = 'google.clientId'
const GOOGLE_CLIENT_SECRET_KEY = 'google.clientSecret'
const GOOGLE_REFRESH_TOKEN_KEY = 'google.refreshToken'
const WEATHER_API_KEY = 'weather.apiKey'
const WEATHER_LOCATION_KEY = 'weather.location'
const SPOTIFY_CLIENT_ID_KEY = 'spotify.clientId'
const SPOTIFY_CLIENT_SECRET_KEY = 'spotify.clientSecret'
const SPOTIFY_REFRESH_TOKEN_KEY = 'spotify.refreshToken'
const STRAVA_CLIENT_ID_KEY = 'strava.clientId'
const STRAVA_CLIENT_SECRET_KEY = 'strava.clientSecret'
const STRAVA_REFRESH_TOKEN_KEY = 'strava.refreshToken'

function getGoogleCreds(): { clientId: string; clientSecret: string; refreshToken: string } | null {
  const clientId = getSecret(GOOGLE_CLIENT_ID_KEY)
  const clientSecret = getSecret(GOOGLE_CLIENT_SECRET_KEY)
  const refreshToken = getSecret(GOOGLE_REFRESH_TOKEN_KEY)
  if (!clientId || !clientSecret || !refreshToken) return null
  return { clientId, clientSecret, refreshToken }
}

function getSpotifyCreds(): { creds: SpotifyCreds; refreshToken: string } | null {
  const clientId = getSecret(SPOTIFY_CLIENT_ID_KEY)
  const clientSecret = getSecret(SPOTIFY_CLIENT_SECRET_KEY)
  const refreshToken = getSecret(SPOTIFY_REFRESH_TOKEN_KEY)
  if (!clientId || !clientSecret || !refreshToken) return null
  return { creds: { clientId, clientSecret }, refreshToken }
}

function getStravaCreds(): { creds: StravaCreds; refreshToken: string } | null {
  const clientId = getSecret(STRAVA_CLIENT_ID_KEY)
  const clientSecret = getSecret(STRAVA_CLIENT_SECRET_KEY)
  const refreshToken = getSecret(STRAVA_REFRESH_TOKEN_KEY)
  if (!clientId || !clientSecret || !refreshToken) return null
  return { creds: { clientId, clientSecret }, refreshToken }
}

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_reminder',
    description: 'Create a reminder that will fire as a desktop notification at the given due time.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'What the reminder is about' },
        dueAt: { type: 'string', description: 'ISO 8601 datetime the reminder is due' },
        recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
        notes: { type: 'string' },
      },
      required: ['title', 'dueAt'],
    },
  },
  {
    name: 'create_goal',
    description: 'Create a new personal goal to track progress toward a numeric target (fitness, work, personal, finance, education, etc).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string', description: 'e.g. fitness, work, personal, finance, education' },
        targetValue: { type: 'number' },
        unit: { type: 'string', description: 'e.g. books, miles, dollars, reps' },
        description: { type: 'string' },
      },
      required: ['title', 'category', 'targetValue', 'unit'],
    },
  },
  {
    name: 'log_goal_progress',
    description: 'Add progress toward an existing goal, matched by (partial) title.',
    input_schema: {
      type: 'object',
      properties: {
        goalTitle: { type: 'string', description: 'Title or partial title of the existing goal' },
        delta: { type: 'number', description: 'Amount of progress to add (can be negative to correct)' },
        note: { type: 'string' },
      },
      required: ['goalTitle', 'delta'],
    },
  },
  {
    name: 'create_transaction',
    description: 'Log a budget transaction (expense or income) under a category, creating the category if it does not exist.',
    input_schema: {
      type: 'object',
      properties: {
        categoryName: { type: 'string' },
        kind: { type: 'string', enum: ['expense', 'income'] },
        amount: { type: 'number', description: 'Positive amount' },
        description: { type: 'string' },
      },
      required: ['categoryName', 'kind', 'amount'],
    },
  },
  {
    name: 'create_food_entry',
    description: 'Log a food/calorie entry for calorie tracking.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        calories: { type: 'number' },
        protein: { type: 'number' },
        carbs: { type: 'number' },
        fat: { type: 'number' },
        consumedAt: { type: 'string', description: 'ISO 8601 datetime, defaults to now' },
      },
      required: ['name', 'calories'],
    },
  },
  {
    name: 'create_exercise_entry',
    description: 'Log a workout/exercise entry, optionally with calories burned, for athletic progress tracking.',
    input_schema: {
      type: 'object',
      properties: {
        activity: { type: 'string' },
        durationMinutes: { type: 'number' },
        caloriesBurned: { type: 'number' },
        notes: { type: 'string' },
        occurredAt: { type: 'string', description: 'ISO 8601 datetime, defaults to now' },
      },
      required: ['activity'],
    },
  },
  {
    name: 'create_calendar_event',
    description: "Create a new event on the user's Google Calendar.",
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        start: { type: 'string', description: 'ISO 8601 datetime (or date if allDay)' },
        end: { type: 'string', description: 'ISO 8601 datetime/date, defaults to start' },
        allDay: { type: 'boolean' },
        location: { type: 'string' },
      },
      required: ['title', 'start'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete an event from the Google Calendar, matched by (partial) title against the currently cached events.',
    input_schema: {
      type: 'object',
      properties: {
        eventTitle: { type: 'string', description: 'Title or partial title of the event to delete' },
      },
      required: ['eventTitle'],
    },
  },
  {
    name: 'sync_weather',
    description: "Fetch the latest current conditions and forecast for the user's configured weather location.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'control_spotify_playback',
    description: "Control Spotify playback on the user's active device (requires Spotify Premium). Actions: play, pause, next, previous.",
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['play', 'pause', 'next', 'previous'] },
      },
      required: ['action'],
    },
  },
  {
    name: 'log_strava_activity',
    description: "Log a manual activity (run, ride, walk, etc) to the user's Strava account.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        type: { type: 'string', description: 'e.g. Run, Ride, Walk, Swim, Workout' },
        startDate: { type: 'string', description: 'ISO local datetime the activity started' },
        durationMinutes: { type: 'number' },
        distanceMiles: { type: 'number' },
      },
      required: ['name', 'type', 'startDate', 'durationMinutes'],
    },
  },
  {
    name: 'mark_canvas_assignment_done',
    description: "Mark a Canvas assignment as done (or not done) in this app's local checklist, matched by (partial) title. This is local-only and does not submit anything to Canvas.",
    input_schema: {
      type: 'object',
      properties: {
        assignmentTitle: { type: 'string', description: 'Title or partial title of the assignment' },
        done: { type: 'boolean', description: 'Defaults to true' },
      },
      required: ['assignmentTitle'],
    },
  },
  {
    name: 'get_unread_emails',
    description: "Fetch the user's currently unread Gmail messages (from, subject, snippet, id). Use this before marking an email as read so you have its id.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'mark_email_read',
    description: 'Mark a Gmail message as read, given its message id from get_unread_emails.',
    input_schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string' },
      },
      required: ['messageId'],
    },
  },
  {
    name: 'get_overview',
    description:
      "Fetch the user's current reminders, active goals, this month's budget summary, upcoming Canvas assignments, upcoming calendar events, recent Oura sleep/readiness/activity scores, bank balances/recent transactions, current weather, Spotify/Strava/Microsoft 365 snapshots, and LinkedIn profile. Use this before answering questions about what's due, owed, in progress, playing, or how they've been sleeping/recovering.",
    input_schema: { type: 'object', properties: {} },
  },
]

export async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'create_reminder': {
      const i = input as { title: string; dueAt: string; recurrence?: Reminder['recurrence']; notes?: string }
      return reminders.createReminder({
        title: i.title,
        dueAt: i.dueAt,
        recurrence: i.recurrence ?? 'none',
        notes: i.notes ?? null,
      })
    }
    case 'create_goal': {
      const i = input as { title: string; category: string; targetValue: number; unit: string; description?: string }
      return goals.createGoal({
        title: i.title,
        category: i.category,
        targetValue: i.targetValue,
        unit: i.unit,
        description: i.description ?? null,
        dueDate: null,
      })
    }
    case 'log_goal_progress': {
      const i = input as { goalTitle: string; delta: number; note?: string }
      const goal = goals.findGoalByTitle(i.goalTitle)
      if (!goal) return { error: `No goal found matching "${i.goalTitle}"` }
      return goals.logGoalProgress(goal.id, i.delta, i.note)
    }
    case 'create_transaction': {
      const i = input as { categoryName: string; kind: 'expense' | 'income'; amount: number; description?: string }
      const category = budget.findOrCreateCategory(i.categoryName, i.kind)
      return budget.createTransaction({
        categoryId: category.id,
        amount: i.amount,
        description: i.description ?? null,
        occurredAt: new Date().toISOString(),
      })
    }
    case 'create_food_entry': {
      const i = input as {
        name: string
        calories: number
        protein?: number
        carbs?: number
        fat?: number
        consumedAt?: string
      }
      return fitness.createFood({
        name: i.name,
        calories: i.calories,
        protein: i.protein ?? null,
        carbs: i.carbs ?? null,
        fat: i.fat ?? null,
        consumedAt: i.consumedAt ?? new Date().toISOString(),
      })
    }
    case 'create_exercise_entry': {
      const i = input as {
        activity: string
        durationMinutes?: number
        caloriesBurned?: number
        notes?: string
        occurredAt?: string
      }
      return fitness.createExercise({
        activity: i.activity,
        durationMinutes: i.durationMinutes ?? null,
        caloriesBurned: i.caloriesBurned ?? null,
        notes: i.notes ?? null,
        occurredAt: i.occurredAt ?? new Date().toISOString(),
      })
    }
    case 'create_calendar_event': {
      const i = input as { title: string; start: string; end?: string; allDay?: boolean; location?: string }
      const google = getGoogleCreds()
      if (!google) return { error: 'Connect Google Calendar in Settings first.' }
      await createCalendarEvent(google.clientId, google.clientSecret, google.refreshToken, {
        title: i.title,
        start: i.start,
        end: i.end ?? null,
        allDay: i.allDay ?? false,
        location: i.location ?? null,
      })
      const events = await fetchUpcomingEvents(google.clientId, google.clientSecret, google.refreshToken)
      calendarRepo.replaceCachedEvents(events)
      return { created: true, events: events.slice(0, 15) }
    }
    case 'delete_calendar_event': {
      const i = input as { eventTitle: string }
      const google = getGoogleCreds()
      if (!google) return { error: 'Connect Google Calendar in Settings first.' }
      const match = calendarRepo
        .listCachedEvents()
        .find((e) => e.title.toLowerCase().includes(i.eventTitle.toLowerCase()))
      if (!match) return { error: `No cached calendar event found matching "${i.eventTitle}"` }
      await deleteCalendarEvent(google.clientId, google.clientSecret, google.refreshToken, match.id)
      const events = await fetchUpcomingEvents(google.clientId, google.clientSecret, google.refreshToken)
      calendarRepo.replaceCachedEvents(events)
      return { deleted: match.title, events: events.slice(0, 15) }
    }
    case 'sync_weather': {
      const apiKey = getSecret(WEATHER_API_KEY)
      const location = getSecret(WEATHER_LOCATION_KEY)
      if (!apiKey || !location) return { error: 'Add a weather API key and location in Settings first.' }
      const snapshot = await fetchWeather(apiKey, location)
      weatherRepo.saveSnapshot(snapshot)
      return snapshot
    }
    case 'control_spotify_playback': {
      const i = input as { action: SpotifyPlaybackAction }
      const spotify = getSpotifyCreds()
      if (!spotify) return { error: 'Connect Spotify in Settings first.' }
      await controlSpotifyPlayback(spotify.creds, spotify.refreshToken, i.action)
      return { ok: true, action: i.action }
    }
    case 'log_strava_activity': {
      const i = input as unknown as NewStravaActivity
      const strava = getStravaCreds()
      if (!strava) return { error: 'Connect Strava in Settings first.' }
      const created = await createManualActivity(strava.creds, strava.refreshToken, i)
      const result = await fetchStravaSnapshot(strava.creds, created.refreshToken)
      stravaRepo.saveSnapshot(result.athleteName, result.activities)
      return { athleteName: result.athleteName, activities: result.activities.slice(0, 10) }
    }
    case 'mark_canvas_assignment_done': {
      const i = input as { assignmentTitle: string; done?: boolean }
      const match = canvasRepo
        .listCachedAssignments()
        .find((a) => a.name.toLowerCase().includes(i.assignmentTitle.toLowerCase()))
      if (!match) return { error: `No cached Canvas assignment found matching "${i.assignmentTitle}"` }
      canvasRepo.setLocalCompletion(match.id, i.done ?? true)
      return { assignment: match.name, done: i.done ?? true }
    }
    case 'get_unread_emails': {
      const google = getGoogleCreds()
      if (!google) return { error: 'Connect Google in Settings first.' }
      return fetchUnreadDigest(google.clientId, google.clientSecret, google.refreshToken, null)
    }
    case 'mark_email_read': {
      const i = input as { messageId: string }
      const google = getGoogleCreds()
      if (!google) return { error: 'Connect Google in Settings first.' }
      await markMessageAsRead(google.clientId, google.clientSecret, google.refreshToken, i.messageId)
      return { markedRead: i.messageId }
    }
    case 'get_overview': {
      const today = new Date().toISOString().slice(0, 10)
      return {
        reminders: reminders.listReminders().filter((r) => !r.completed).slice(0, 15),
        goals: goals.listGoals().filter((g) => !g.archived),
        budget: budget.summary(),
        assignments: canvasRepo.listCachedAssignments().filter((a) => !a.submitted).slice(0, 15),
        calendarEvents: calendarRepo.listCachedEvents().slice(0, 15),
        fitnessToday: fitness.dailyTotals(today),
        ouraRecent: ouraRepo.listCachedOuraDays().slice(0, 7),
        bankAccounts: [...plaidRepo.listCachedAccounts(), ...simplefinRepo.listCachedAccounts()],
        bankTransactionsRecent: [
          ...plaidRepo.listCachedTransactions().slice(0, 10),
          ...simplefinRepo.listCachedTransactions().slice(0, 10),
        ],
        weather: weatherRepo.getCachedSnapshot(),
        spotify: spotifyRepo.getCachedSnapshot(),
        strava: stravaRepo.getCachedSnapshot(),
        microsoft365: microsoftRepo.getCachedSnapshot(),
        linkedin: linkedinRepo.getProfile(),
      }
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}
