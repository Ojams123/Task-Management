import { google } from 'googleapis'
import { clientFor } from './googleClient'
import type { CalendarEvent, NewCalendarEvent } from '../../src/shared/types'

export async function fetchUpcomingEvents(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<CalendarEvent[]> {
  const auth = clientFor(clientId, clientSecret, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  // Wide enough that the week-grid view's prev/next navigation has real
  // data a few weeks in either direction, not just "upcoming".
  const timeMin = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
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

export async function createCalendarEvent(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  input: NewCalendarEvent
): Promise<CalendarEvent> {
  const auth = clientFor(clientId, clientSecret, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: input.title,
      location: input.location ?? undefined,
      start: input.allDay ? { date: input.start.slice(0, 10) } : { dateTime: input.start },
      end: input.allDay
        ? { date: (input.end ?? input.start).slice(0, 10) }
        : { dateTime: input.end ?? input.start },
    },
  })

  const e = res.data
  return {
    id: e.id ?? crypto.randomUUID(),
    title: e.summary ?? input.title,
    start: (e.start?.dateTime ?? e.start?.date ?? input.start) as string,
    end: (e.end?.dateTime ?? e.end?.date ?? null) as string | null,
    allDay: !!e.start?.date && !e.start?.dateTime,
    location: e.location ?? null,
    htmlLink: e.htmlLink ?? null,
  }
}

export async function deleteCalendarEvent(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  eventId: string
): Promise<void> {
  const auth = clientFor(clientId, clientSecret, refreshToken)
  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.delete({ calendarId: 'primary', eventId })
}
