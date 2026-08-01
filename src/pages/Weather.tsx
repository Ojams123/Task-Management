import { useEffect, useState } from 'react'
import type { WeatherSnapshot } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { CloudSunIcon } from '../components/icons'

function iconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`
}

export function Weather({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const status = await window.api.weather.getSettings()
    setConfigured(status.configured)
    if (status.configured) setSnapshot(await window.api.weather.getCached())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function sync() {
    setSyncing(true)
    setError(null)
    try {
      setSnapshot(await window.api.weather.sync())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (configured === false) {
    return (
      <div className="card">
        <h3>
          <span className="heading-with-icon">
            <CloudSunIcon size={20} />
            Set up weather
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Add a free OpenWeatherMap API key and your location in Settings to see current conditions and a 5-day
          forecast here.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>
          <span className="heading-with-icon">
            <CloudSunIcon size={20} />
            {snapshot?.locationName ?? 'Current conditions'}
          </span>
          <button className="btn btn-sm" onClick={sync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </h3>
        {error && (
          <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
            {error}
          </p>
        )}
        {!snapshot ? (
          <div className="empty-state">No data synced yet — click "Sync".</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {snapshot.icon && (
              <img src={iconUrl(snapshot.icon)} alt={snapshot.condition ?? ''} width={72} height={72} />
            )}
            <div className="stat">
              <span className="stat-value" style={{ fontSize: 40 }}>
                {snapshot.tempF != null ? `${snapshot.tempF}°F` : '—'}
              </span>
              <span className="stat-label" style={{ textTransform: 'capitalize' }}>
                {snapshot.condition ?? 'Unknown'} · feels like {snapshot.feelsLikeF ?? '—'}°F
              </span>
            </div>
            <div className="grid grid-2" style={{ flex: 1, gap: 10 }}>
              <div className="stat">
                <span className="stat-label">Humidity</span>
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {snapshot.humidity != null ? `${snapshot.humidity}%` : '—'}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Wind</span>
                <span className="stat-value" style={{ fontSize: 18 }}>
                  {snapshot.windMph != null ? `${snapshot.windMph} mph` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {snapshot && snapshot.forecast.length > 0 && (
        <div className="card">
          <h3>5-day forecast</h3>
          <div className="grid grid-3">
            {snapshot.forecast.map((day) => (
              <div className="list-row" key={day.date} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                <div className="list-row-title">
                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={iconUrl(day.icon)} alt={day.condition} width={40} height={40} />
                  <span className="muted" style={{ textTransform: 'capitalize' }}>
                    {day.condition}
                  </span>
                </div>
                <div className="list-row-sub">
                  {day.highF}° / {day.lowF}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
