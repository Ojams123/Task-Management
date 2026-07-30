import * as chrono from 'chrono-node'
import type { Page } from '../components/Sidebar'

export type VoiceIntent =
  | { type: 'add-reminder'; title: string; dueAt: string }
  | { type: 'navigate'; page: Page }
  | { type: 'unrecognized' }

const PAGE_KEYWORDS: { keywords: string[]; page: Page }[] = [
  { keywords: ['dashboard', 'home', 'overview'], page: 'dashboard' },
  { keywords: ['reminder', 'reminders'], page: 'reminders' },
  { keywords: ['goal', 'goals', 'progress'], page: 'goals' },
  { keywords: ['budget', 'spending', 'expenses', 'money'], page: 'budget' },
  { keywords: ['assignment', 'assignments', 'canvas', 'homework', 'classwork'], page: 'assignments' },
  { keywords: ['notification', 'notifications', 'email', 'emails', 'messages'], page: 'notifications' },
  { keywords: ['setting', 'settings'], page: 'settings' },
]

const REMINDER_TRIGGERS = [
  /^remind me to (.+)/i,
  /^(?:add|create|set)(?: a)? reminder to (.+)/i,
  /^(?:add|create|set)(?: a)? reminder (?:that )?(.+)/i,
]

const NAV_TRIGGERS = [/^(?:go to|open|show|navigate to|take me to) (.+)/i]

function matchPage(text: string): Page | null {
  const lower = text.toLowerCase()
  for (const { keywords, page } of PAGE_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return page
  }
  return null
}

export function parseVoiceCommand(rawTranscript: string): VoiceIntent {
  const transcript = rawTranscript.trim()
  if (!transcript) return { type: 'unrecognized' }

  for (const pattern of REMINDER_TRIGGERS) {
    const match = transcript.match(pattern)
    if (match) {
      const rest = match[1]
      const parsedDate = chrono.parse(rest, new Date(), { forwardDate: true })
      if (parsedDate.length > 0) {
        const result = parsedDate[0]
        const title = (rest.slice(0, result.index) + rest.slice(result.index + result.text.length))
          .replace(/\s+/g, ' ')
          .replace(/^(at|on|for|by)\s+/i, '')
          .trim()
        return {
          type: 'add-reminder',
          title: title || 'Reminder',
          dueAt: result.start.date().toISOString(),
        }
      }
      // No recognizable time phrase — default to one hour from now.
      const dueAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      return { type: 'add-reminder', title: rest.trim(), dueAt }
    }
  }

  for (const pattern of NAV_TRIGGERS) {
    const match = transcript.match(pattern)
    if (match) {
      const page = matchPage(match[1])
      if (page) return { type: 'navigate', page }
    }
  }

  const page = matchPage(transcript)
  if (page) return { type: 'navigate', page }

  return { type: 'unrecognized' }
}
