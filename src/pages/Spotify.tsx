import { useEffect, useState } from 'react'
import type { SpotifySnapshot } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { SpotifyIcon } from '../components/icons'

export function Spotify({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [snapshot, setSnapshot] = useState<SpotifySnapshot | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const status = await window.api.spotify.getStatus()
    setConnected(status.connected)
    if (status.connected) setSnapshot(await window.api.spotify.getCached())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function sync() {
    setSyncing(true)
    setError(null)
    try {
      setSnapshot(await window.api.spotify.sync())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (connected === false) {
    return (
      <div className="card">
        <h3>
          <span className="heading-with-icon">
            <SpotifyIcon size={20} />
            Connect Spotify
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Connect your Spotify account in Settings to see your recently played tracks here.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>
        <span className="heading-with-icon">
          <SpotifyIcon size={20} />
          {snapshot?.profile.displayName ?? 'Recently played'}
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
      {!snapshot || snapshot.recentlyPlayed.length === 0 ? (
        <div className="empty-state">No data synced yet — click "Sync".</div>
      ) : (
        <div className="list">
          {snapshot.recentlyPlayed.map((track, i) => (
            <div className="list-row" key={`${track.trackName}-${track.playedAt}-${i}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {track.albumArt && (
                  <img src={track.albumArt} alt="" width={40} height={40} style={{ borderRadius: 6 }} />
                )}
                <div className="list-row-main">
                  <div className="list-row-title">{track.trackName}</div>
                  <div className="list-row-sub">{track.artistName}</div>
                </div>
              </div>
              <div className="list-row-actions">
                <span className="muted">
                  {new Date(track.playedAt).toLocaleString(undefined, {
                    weekday: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
