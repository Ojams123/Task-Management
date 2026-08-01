import { useEffect, useRef, useState } from 'react'
import type { CalendarEvent } from '../shared/types'

const HOUR_HEIGHT = 48
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

function layoutDayEvents(events: CalendarEvent[]): PositionedEvent[] {
  const withTimes = events
    .map((e) => {
      const start = new Date(e.start)
      const end = e.end ? new Date(e.end) : new Date(start.getTime() + 30 * 60000)
      return { event: e, startMin: minutesSinceMidnight(start), endMin: Math.max(minutesSinceMidnight(end), minutesSinceMidnight(start) + 20) }
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
      bodyRef.current.scrollTop = Math.max(0, minutesSinceMidnight(new Date()) / 60 - 2) * HOUR_HEIGHT
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
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="week-calendar-hour-label" style={{ height: HOUR_HEIGHT }}>
              {h === 0 ? '' : new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric' })}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const dayEvents = layoutDayEvents(timedEvents.filter((e) => isSameDay(new Date(e.start), d)))
          const isToday = isSameDay(d, today)
          return (
            <div key={d.toISOString()} className="week-calendar-day-col" style={{ height: 24 * HOUR_HEIGHT }}>
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="week-calendar-hour-row" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
              ))}
              {isToday && <div className="week-calendar-now-line" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }} />}
              {dayEvents.map(({ event, left, width, top, height }) => {
                const isCanvas = event.source === 'canvas'
                return (
                  <div
                    key={event.id}
                    className={`week-calendar-event${isCanvas ? ' week-calendar-event-canvas' : ''}`}
                    style={{ left: `${left}%`, width: `calc(${width}% - 3px)`, top, height: Math.max(height, 20) }}
                    onClick={() => onDelete(event.id)}
                    title={isCanvas ? `${event.title} — due, click to open in Canvas` : `${event.title} — click to delete`}
                  >
                    <div className="week-calendar-event-title">
                      {isCanvas ? '📘 ' : ''}
                      {event.title}
                    </div>
                    {height > 30 && (
                      <div className="week-calendar-event-time">
                        {new Date(event.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
