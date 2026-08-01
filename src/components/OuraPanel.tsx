import { useEffect, useMemo, useRef, useState } from 'react'
import type { OuraDailySummary } from '../shared/types'

type OuraMetric = 'sleep' | 'readiness' | 'activity'

const METRIC_CONFIG: Record<OuraMetric, { label: string; color: string }> = {
  sleep: { label: 'Sleep', color: 'var(--hue-2)' },
  readiness: { label: 'Readiness', color: 'var(--hue-5)' },
  activity: { label: 'Activity', color: 'var(--hue-4)' },
}

function scoreFor(day: OuraDailySummary, metric: OuraMetric): number | null {
  if (metric === 'sleep') return day.sleepScore
  if (metric === 'readiness') return day.readinessScore
  return day.activityScore
}

function formatMinutes(mins: number | null): string {
  if (mins == null) return '—'
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function formatDay(date: string, opts: Intl.DateTimeFormatOptions): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, opts)
}

export function OuraPanel({ days }: { days: OuraDailySummary[] }) {
  const [metric, setMetric] = useState<OuraMetric>('sleep')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)

  // listCached() returns most-recent-first — flip to chronological (oldest to
  // newest, left to right) so the chart reads the same direction as the rest
  // of the app's week/day views.
  const chronological = useMemo(() => [...days].reverse(), [days])

  const selected =
    chronological.find((d) => d.date === selectedDate) ?? chronological[chronological.length - 1] ?? null

  useEffect(() => {
    chartRef.current?.scrollTo({ left: chartRef.current.scrollWidth })
  }, [chronological.length])

  if (chronological.length === 0) {
    return <div className="empty-state">No data synced yet — click "Sync".</div>
  }

  const config = METRIC_CONFIG[metric]
  const maxValue = 100 // Oura scores are 0-100 — a fixed ceiling keeps bar heights comparable day to day

  return (
    <div className="oura-panel">
      <div className="oura-tabs">
        {(Object.keys(METRIC_CONFIG) as OuraMetric[]).map((m) => (
          <button
            key={m}
            className={`oura-tab${metric === m ? ' active' : ''}`}
            style={{ ['--tab-color' as string]: METRIC_CONFIG[m].color }}
            onClick={() => setMetric(m)}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="oura-headline">
          <span className="oura-headline-value" style={{ color: config.color }}>
            {scoreFor(selected, metric) ?? '—'}
          </span>
          <span className="oura-headline-label">
            {config.label} score · {formatDay(selected.date, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}

      <div className="oura-chart" ref={chartRef}>
        {chronological.map((d) => {
          const value = scoreFor(d, metric)
          const isSelected = d.date === selected?.date
          const heightPct = value != null ? Math.max(4, (value / maxValue) * 100) : 4
          return (
            <button
              key={d.date}
              type="button"
              className={`oura-bar-col${isSelected ? ' selected' : ''}${value == null ? ' no-data' : ''}`}
              onClick={() => setSelectedDate(d.date)}
              title={`${formatDay(d.date, { weekday: 'short', month: 'short', day: 'numeric' })}: ${value ?? 'no data'}`}
            >
              <span className="oura-bar-value">{isSelected && value != null ? value : ''}</span>
              <span className="oura-bar" style={{ height: `${heightPct}%`, background: isSelected ? config.color : 'var(--border-strong)' }} />
              <span className="oura-bar-day">{formatDay(d.date, { weekday: 'narrow' })}</span>
            </button>
          )
        })}
      </div>

      {selected && (
        <div className="grid grid-3" style={{ marginTop: 16 }}>
          {metric === 'sleep' && (
            <>
              <div className="stat">
                <span className="stat-label">Sleep score</span>
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {selected.sleepScore ?? '—'}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Total sleep</span>
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {formatMinutes(selected.totalSleepMinutes)}
                </span>
              </div>
            </>
          )}
          {metric === 'readiness' && (
            <div className="stat">
              <span className="stat-label">Readiness score</span>
              <span className="stat-value" style={{ fontSize: 18 }}>
                {selected.readinessScore ?? '—'}
              </span>
            </div>
          )}
          {metric === 'activity' && (
            <>
              <div className="stat">
                <span className="stat-label">Activity score</span>
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {selected.activityScore ?? '—'}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Steps</span>
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {selected.steps?.toLocaleString() ?? '—'}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Active calories</span>
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {selected.activeCalories ?? '—'}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
