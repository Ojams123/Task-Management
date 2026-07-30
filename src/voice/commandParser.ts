import * as chrono from 'chrono-node'
import type { Page } from '../components/Sidebar'

export type VoiceIntent =
  | { type: 'add-reminder'; title: string; dueAt: string }
  | { type: 'add-goal'; title: string; category: string; targetValue: number; unit: string }
  | { type: 'add-transaction'; amount: number; categoryName: string; kind: 'expense' | 'income' }
  | { type: 'add-food'; name: string; calories: number }
  | { type: 'add-exercise'; activity: string; durationMinutes: number | null; caloriesBurned: number | null }
  | { type: 'navigate'; page: Page }
  | { type: 'unrecognized' }

const PAGE_KEYWORDS: { keywords: string[]; page: Page }[] = [
  { keywords: ['dashboard', 'home', 'overview'], page: 'dashboard' },
  { keywords: ['reminder', 'reminders'], page: 'reminders' },
  { keywords: ['goal', 'goals', 'progress'], page: 'goals' },
  { keywords: ['budget', 'spending', 'expenses', 'money'], page: 'budget' },
  { keywords: ['assignment', 'assignments', 'canvas', 'homework', 'classwork'], page: 'assignments' },
  { keywords: ['notification', 'notifications', 'email', 'emails', 'messages'], page: 'notifications' },
  { keywords: ['calendar', 'events'], page: 'calendar' },
  { keywords: ['fitness', 'workout', 'nutrition', 'calorie', 'calories'], page: 'fitness' },
  { keywords: ['assistant', 'chat', 'bot'], page: 'assistant' },
  { keywords: ['setting', 'settings'], page: 'settings' },
]

const REMINDER_TRIGGERS = [
  /^remind me to (.+)/i,
  /^(?:add|create|set)(?: a)? reminder to (.+)/i,
  /^(?:add|create|set)(?: a)? reminder (?:that )?(.+)/i,
]

const GOAL_TRIGGERS = [/^(?:add|create|set)(?: a)? goal(?: to)? (.+)/i]

const EXPENSE_TRIGGERS = [
  /^(?:i spent|log an expense of|add an expense of|spent)\s+\$?(\d+(?:\.\d+)?)\s*(?:on|for)\s+(.+)/i,
]
const INCOME_TRIGGERS = [
  /^(?:log|add)(?: an)? income of\s+\$?(\d+(?:\.\d+)?)\s*(?:from|for)\s+(.+)/i,
  /^i (?:got|earned|received)\s+\$?(\d+(?:\.\d+)?)\s*(?:from|for)\s+(.+)/i,
]

const FOOD_TRIGGERS = [
  /^(?:i ate|log food|add food|log meal|log a meal)\s+(.+)/i,
]

const EXERCISE_TRIGGERS = [
  /^(?:log|add)(?: a)? (?:workout|exercise)\s+(.+)/i,
  /^i (?:worked out|exercised|did)\s+(.+)/i,
]

const NAV_TRIGGERS = [/^(?:go to|open|show|navigate to|take me to) (.+)/i]

function matchPage(text: string): Page | null {
  const lower = text.toLowerCase()
  for (const { keywords, page } of PAGE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return page
  }
  return null
}

function extractNumber(text: string, unitPattern: string): { value: number; remainder: string } | null {
  const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:${unitPattern})\\b`, 'i')
  const match = text.match(re)
  if (!match) return null
  return {
    value: Number(match[1]),
    remainder: (text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length))
      .replace(/\s+/g, ' ')
      .replace(/[,.]\s*$/, '')
      .trim(),
  }
}

function firstMatch(transcript: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = transcript.match(pattern)
    if (match) return match
  }
  return null
}

export function parseVoiceCommand(rawTranscript: string): VoiceIntent {
  const transcript = rawTranscript.trim()
  if (!transcript) return { type: 'unrecognized' }

  const reminderMatch = firstMatch(transcript, REMINDER_TRIGGERS)
  if (reminderMatch) {
    const rest = reminderMatch[1]
    const parsedDate = chrono.parse(rest, new Date(), { forwardDate: true })
    if (parsedDate.length > 0) {
      const result = parsedDate[0]
      const title = (rest.slice(0, result.index) + rest.slice(result.index + result.text.length))
        .replace(/\s+/g, ' ')
        .replace(/^(at|on|for|by)\s+/i, '')
        .trim()
      return { type: 'add-reminder', title: title || 'Reminder', dueAt: result.start.date().toISOString() }
    }
    return { type: 'add-reminder', title: rest.trim(), dueAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }
  }

  const goalMatch = firstMatch(transcript, GOAL_TRIGGERS)
  if (goalMatch) {
    const rest = goalMatch[1]
    const targetMatch = rest.match(/(.+?)\s+target\s+(\d+(?:\.\d+)?)\s*(\w+)?/i)
    if (targetMatch) {
      return {
        type: 'add-goal',
        title: targetMatch[1].trim(),
        category: 'general',
        targetValue: Number(targetMatch[2]),
        unit: targetMatch[3] ?? 'units',
      }
    }
    return { type: 'add-goal', title: rest.trim(), category: 'general', targetValue: 100, unit: 'percent' }
  }

  const expenseMatch = firstMatch(transcript, EXPENSE_TRIGGERS)
  if (expenseMatch) {
    return {
      type: 'add-transaction',
      amount: Number(expenseMatch[1]),
      categoryName: expenseMatch[2].trim(),
      kind: 'expense',
    }
  }

  const incomeMatch = firstMatch(transcript, INCOME_TRIGGERS)
  if (incomeMatch) {
    return {
      type: 'add-transaction',
      amount: Number(incomeMatch[1]),
      categoryName: incomeMatch[2].trim(),
      kind: 'income',
    }
  }

  const foodMatch = firstMatch(transcript, FOOD_TRIGGERS)
  if (foodMatch) {
    const rest = foodMatch[1]
    const extracted = extractNumber(rest, 'cal|calorie|calories')
    if (extracted) {
      return { type: 'add-food', name: extracted.remainder || 'Food', calories: extracted.value }
    }
    return { type: 'add-food', name: rest.trim(), calories: 0 }
  }

  const exerciseMatch = firstMatch(transcript, EXERCISE_TRIGGERS)
  if (exerciseMatch) {
    let rest = exerciseMatch[1]
    let durationMinutes: number | null = null
    let caloriesBurned: number | null = null

    const duration = extractNumber(rest, 'min|mins|minute|minutes')
    if (duration) {
      durationMinutes = duration.value
      rest = duration.remainder
    }
    const calories = extractNumber(rest, 'cal|calorie|calories')
    if (calories) {
      caloriesBurned = calories.value
      rest = calories.remainder
    }
    const activity = rest.replace(/^for\s+/i, '').trim()
    return { type: 'add-exercise', activity: activity || 'Workout', durationMinutes, caloriesBurned }
  }

  const navMatch = firstMatch(transcript, NAV_TRIGGERS)
  if (navMatch) {
    const page = matchPage(navMatch[1])
    if (page) return { type: 'navigate', page }
  }

  const page = matchPage(transcript)
  if (page) return { type: 'navigate', page }

  return { type: 'unrecognized' }
}
