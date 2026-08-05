import { useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '../shared/types'

const HOUR_HEIGHT = 68
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// The grid shows a snapshot of the active part of the day (6am–midnight)
// instead of the full 24 hours, so there's no dead scrolling through the
// small hours most days have nothing scheduled in.
const START_HOUR = 6
const VISIBLE_HOURS = 24 - START_HOUR

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

interface PositionedEvent {
  event: CalendarEvent
  left: number
  width: number
  top: number
  height: number
}

const CANVAS_CHIP_HEIGHT = 36

// Canvas due-dates are point-in-time markers, not real scheduled durations —
// several assignments commonly share the same due time (11:59pm is a very
// common Canvas default). Running them through the side-by-side overlap
// layout below would split them into ever-narrower unreadable slivers, so
// they get their own compact vertically-stacked list instead.
function layoutCanvasStack(events: CalendarEvent[]): PositionedEvent[] {
  const withTimes = events
    .map((e) => ({ event: e, startMin: Math.max(minutesSinceMidnight(new Date(e.start)) - START_HOUR * 60, 0) }))
    .sort((a, b) => a.startMin - b.startMin)

  let nextTop = -Infinity
  return withTimes.map(({ event, startMin }) => {
    const top = Math.max((startMin / 60) * HOUR_HEIGHT, nextTop)
    nextTop = top + CANVAS_CHIP_HEIGHT + 2
    return { event, left: 0, width: 100, top, height: CANVAS_CHIP_HEIGHT }
  })
}

function layoutDayEvents(events: CalendarEvent[]): PositionedEvent[] {
  const withTimes = events
    .map((e) => {
      const start = new Date(e.start)
      const end = e.end ? new Date(e.end) : new Date(start.getTime() + 30 * 60000)
      const rawStart = minutesSinceMidnight(start) - START_HOUR * 60
      const rawEnd = Math.max(minutesSinceMidnight(end), minutesSinceMidnight(start) + 36) - START_HOUR * 60
      return { event: e, startMin: Math.max(rawStart, 0), endMin: Math.max(rawEnd, 36) }
    })
    .sort((a, b) => a.startMin - b.startMin)

  const clusters: (typeof withTimes)[] = []
  let current: typeof withTimes = []
  let clusterEnd = -Infinity
  for (const item of withTimes) {
    if (current.length === 0 || item.startMin < clusterEnd) {
      current.push(item)
      clusterEnd = Math.max(clusterEnd, item.endMin)
    } else {
      clusters.push(current)
      current = [item]
      clusterEnd = item.endMin
    }
  }
  if (current.length) clusters.push(current)

  const result: PositionedEvent[] = []
  for (const cluster of clusters) {
    const n = cluster.length
    cluster.forEach((item, i) => {
      result.push({
        event: item.event,
        left: (i / n) * 100,
        width: (1 / n) * 100,
        top: (item.startMin / 60) * HOUR_HEIGHT,
        height: ((item.endMin - item.startMin) / 60) * HOUR_HEIGHT,
      })
    })
  }
  return result
}

export function WeekCalendar({
  events,
  onDelete,
}: {
  events: CalendarEvent[]
  onDelete: (id: string) => void
}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = Math.max(0, minutesSinceMidnight(new Date()) / 60 - START_HOUR - 2) * HOUR_HEIGHT
    }
  }, [])

  const today = new Date()
  const anchor = new Date(today)
  anchor.setDate(anchor.getDate() + weekOffset * 7)
  const weekStart = startOfWeek(anchor)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const allDayEvents = events.filter((e) => e.allDay)
  const timedEvents = events.filter((e) => !e.allDay)

  const nowMinutes = minutesSinceMidnight(today)

  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
      : `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="week-calendar">
      <div className="week-calendar-toolbar">
        <div className="week-calendar-range">{rangeLabel}</div>
        <div className="week-calendar-nav">
          <button className="btn btn-sm" onClick={() => setWeekOffset((w) => w - 1)}>
            ‹ Prev
          </button>
          <button className="btn btn-sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            Today
          </button>
          <button className="btn btn-sm" onClick={() => setWeekOffset((w) => w + 1)}>
            Next ›
          </button>
        </div>
      </div>
      <div className="week-calendar-scroll">
      <div className="week-calendar-header">
        <div className="week-calendar-hour-gutter" />
        {days.map((d) => (
          <div key={d.toISOString()} className={`week-calendar-day-header${isSameDay(d, today) ? ' today' : ''}`}>
            <div className="week-calendar-day-name">{DAY_NAMES[d.getDay()]}</div>
            <div className="week-calendar-day-num">{d.getDate()}</div>
          </div>
        ))}
      </div>

      {allDayEvents.length > 0 && (
        <div className="week-calendar-allday-row">
          <div className="week-calendar-hour-gutter" />
          {days.map((d) => (
            <div key={d.toISOString()} className="week-calendar-allday-col">
              {allDayEvents
                .filter((e) => isSameDay(new Date(e.start), d))
                .map((e) => (
                  <div
                    key={e.id}
                    className={`week-calendar-allday-chip${e.source === 'canvas' ? ' week-calendar-chip-canvas' : ''}`}
                    onClick={() => onDelete(e.id)}
                    title={e.source === 'canvas' ? 'Canvas assignment — click to open' : 'Click to delete'}
                  >
                    {e.title}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      <div className="week-calendar-body" ref={bodyRef}>
        <div className="week-calendar-hour-gutter">
          {Array.from({ length: VISIBLE_HOURS }, (_, i) => {
            const h = i + START_HOUR
            return (
              <div key={h} className="week-calendar-hour-label" style={{ height: HOUR_HEIGHT }}>
                {new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric' })}
              </div>
            )
          })}
        </div>
        {days.map((d) => {
          const dayTimedEvents = timedEvents.filter((e) => isSameDay(new Date(e.start), d))
          // Canvas due-dates and reminders are both point-in-time markers, not
          // scheduled durations, so they share the compact stacked layout
          // instead of the side-by-side overlap layout used for real events.
          const dayEvents = layoutDayEvents(dayTimedEvents.filter((e) => e.source !== 'canvas' && e.source !== 'reminder'))
          const markerChips = layoutCanvasStack(
            dayTimedEvents.filter((e) => e.source === 'canvas' || e.source === 'reminder')
          )
          const isToday = isSameDay(d, today)
          return (
            <div key={d.toISOString()} className="week-calendar-day-col" style={{ height: VISIBLE_HOURS * HOUR_HEIGHT }}>
              {Array.from({ length: VISIBLE_HOURS }, (_, i) => (
                <div key={i} className="week-calendar-hour-row" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
              ))}
              {isToday && nowMinutes >= START_HOUR * 60 && (
                <div
                  className="week-calendar-now-line"
                  style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT }}
                />
              )}
              {dayEvents.map(({ event, left, width, top, height }) => {
                const boxHeight = Math.max(height, 34)
                return (
                  <div
                    key={event.id}
                    className="week-calendar-event"
                    style={{ left: `${left}%`, width: `calc(${width}% - 3px)`, top, height: boxHeight }}
                    onClick={() => onDelete(event.id)}
                    title={`${event.title} — click to delete`}
                  >
                    <div className="week-calendar-event-title">{event.title}</div>
                    {event.location && boxHeight > 48 && (
                      <div className="week-calendar-event-location">{event.location}</div>
                    )}
                    {boxHeight > 40 && (
                      <div className="week-calendar-event-time">
                        {new Date(event.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )
              })}
              {markerChips.map(({ event, top, height }) => {
                const isReminder = event.source === 'reminder'
                const timeLabel = new Date(event.start).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })
                return (
                  <div
                    key={event.id}
                    className={`week-calendar-event-compact${isReminder ? ' week-calendar-chip-reminder' : ''}`}
                    style={{ top, height }}
                    onClick={() => onDelete(event.id)}
                    title={
                      isReminder
                        ? `${event.title} — due ${timeLabel}, click to open in Reminders`
                        : `${event.title} (${event.location}) — due ${timeLabel}, click to open in Canvas`
                    }
                  >
                    {isReminder ? '🔔' : '📘'} {event.title}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
