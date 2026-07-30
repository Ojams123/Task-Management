import { getDb } from '../index'
import type { CalendarEvent } from '../../../src/shared/types'

interface CalendarEventRow extends Omit<CalendarEvent, 'allDay'> {
  allDay: number
  syncedAt: string
}

export function replaceCachedEvents(events: CalendarEvent[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()

  const tx = db.transaction((rows: CalendarEvent[]) => {
    db.prepare('DELETE FROM calendar_events').run()
    const insert = db.prepare(
      `INSERT INTO calendar_events (id, title, start, end, allDay, location, htmlLink, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const e of rows) {
      insert.run(e.id, e.title, e.start, e.end, e.allDay ? 1 : 0, e.location, e.htmlLink, syncedAt)
    }
  })
  tx(events)
}

export function listCachedEvents(): CalendarEvent[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM calendar_events ORDER BY start ASC').all() as CalendarEventRow[]
  return rows.map((r) => ({ ...r, allDay: !!r.allDay }))
}
