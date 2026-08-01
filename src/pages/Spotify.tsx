import { useEffect, useRef, useState } from 'react'
import type { SpotifyPlaybackAction, SpotifyPlaybackState, SpotifySnapshot } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { PauseIcon, PlayIcon, SkipNextIcon, SkipPreviousIcon, SpotifyIcon } from '../components/icons'

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function Spotify({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [snapshot, setSnapshot] = useState<SpotifySnapshot | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [playback, setPlayback] = useState<SpotifyPlaybackState | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [controlling, setControlling] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refresh() {
    const status = await window.api.spotify.getStatus()
    setConnected(status.connected)
    if (status.connected) setSnapshot(await window.api.spotify.getCached())
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    if (!connected) return
    let cancelled = false
    async function poll() {
      try {
        const state = await window.api.spotify.getPlaybackState()
        if (!cancelled) setPlayback(state)
      } catch {
        // silent — polling shouldn't spam errors, only explicit control actions surface them
      }
    }
    poll()
    pollRef.current = setInterval(poll, 5000)
    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [connected])

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

  async function control(action: SpotifyPlaybackAction) {
    setControlling(true)
    setPlaybackError(null)
    try {
      await window.api.spotify.controlPlayback(action)
      await new Promise((r) => setTimeout(r, 400))
      setPlayback(await window.api.spotify.getPlaybackState())
    } catch (e) {
      setPlaybackError(e instanceof Error ? e.message : 'Playback control failed')
    } finally {
      setControlling(false)
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
          Connect your Spotify account in Settings to see your recently played tracks and control playback here.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  const progressPct = playback?.durationMs ? Math.min(100, ((playback.progressMs ?? 0) / playback.durationMs) * 100) : 0

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Now playing</h3>
        {playbackError && (
          <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
            {playbackError}
          </p>
        )}
        {!playback ? (
          <div className="empty-state">
            Nothing playing right now — start a song on your phone or computer, then it'll show up here.
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              {playback.albumArt && (
                <img src={playback.albumArt} alt="" width={56} height={56} style={{ borderRadius: 8 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div className="list-row-title">{playback.trackName}</div>
                <div className="list-row-sub">{playback.artistName}</div>
                {playback.deviceName && <div className="muted">Playing on {playback.deviceName}</div>}
              </div>
            </div>
            {playback.durationMs != null && (
              <div style={{ marginBottom: 14 }}>
                <div className="progress-bar" style={{ marginBottom: 4 }}>
                  <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>{formatMs(playback.progressMs ?? 0)}</span>
                  <span>{formatMs(playback.durationMs)}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-icon" onClick={() => control('previous')} disabled={controlling}>
                <SkipPreviousIcon size={18} />
              </button>
              <button className="btn btn-primary btn-icon" onClick={() => control(playback.isPlaying ? 'pause' : 'play')} disabled={controlling}>
                {playback.isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
              </button>
              <button className="btn btn-icon" onClick={() => control('next')} disabled={controlling}>
                <SkipNextIcon size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

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
    </div>
  )
}
