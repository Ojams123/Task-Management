import { google } from 'googleapis'
import { clientFor } from './googleAuth'
import type { CalendarEvent } from '../../src/shared/types'

export async function fetchUpcomingEvents(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<CalendarEvent[]> {
  const auth = clientFor(clientId, clientSecret, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  })

  const events = res.data.items ?? []

  return events
    .filter((e) => e.status !== 'cancelled')
    .map((e) => {
      const allDay = !!e.start?.date && !e.start?.dateTime
      return {
        id: e.id ?? crypto.randomUUID(),
        title: e.summary ?? '(no title)',
        start: (e.start?.dateTime ?? e.start?.date ?? timeMin) as string,
        end: (e.end?.dateTime ?? e.end?.date ?? null) as string | null,
        allDay,
        location: e.location ?? null,
        htmlLink: e.htmlLink ?? null,
      }
    })
}
