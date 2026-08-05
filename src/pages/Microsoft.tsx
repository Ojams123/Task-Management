import { useEffect, useState } from 'react'
import type { MicrosoftSnapshot } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { MicrosoftIcon } from '../components/icons'
import { Glyph } from '../components/Glyph'

export function Microsoft({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [snapshot, setSnapshot] = useState<MicrosoftSnapshot | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const status = await window.api.microsoft.getStatus()
    setConnected(status.connected)
    if (status.connected) setSnapshot(await window.api.microsoft.getCached())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function sync() {
    setSyncing(true)
    setError(null)
    try {
      setSnapshot(await window.api.microsoft.sync())
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
            <MicrosoftIcon size={20} />
            Connect Microsoft 365
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Connect your Microsoft account in Settings to see unread Outlook mail and recent Word/Excel/PowerPoint
          files here.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="grid-editorial" style={{ marginBottom: 20 }}>
        <div className="card hero-card span-3">
          <h3>
            <span className="heading-with-icon">
              <MicrosoftIcon size={20} />
              {snapshot?.displayName ?? 'Outlook'}
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
          {!snapshot || snapshot.unreadItems.length === 0 ? (
            <div className="empty-state">
              {snapshot ? "You're all caught up." : 'No data synced yet — click "Sync".'}
            </div>
          ) : (
            <div className="list">
              {snapshot.unreadItems.map((item, i) => (
                <div className="fin-row" key={i}>
                  <Glyph label={item.from} />
                  <div className="fin-row-main">
                    <div className="fin-row-title">{item.subject}</div>
                    <div className="fin-row-sub">{item.from}</div>
                  </div>
                  <span className="muted">{new Date(item.receivedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card span-1">
          <div className="stat">
            <span className="stat-label">Unread</span>
            <span className="hero-value" style={{ fontSize: 34 }}>{snapshot?.unreadItems.length ?? 0}</span>
          </div>
        </div>
      </div>

      {snapshot && snapshot.recentFiles.length > 0 && (
        <div className="card">
          <h3>Recent Word, Excel & PowerPoint files</h3>
          <div className="list">
            {snapshot.recentFiles.map((file) => (
              <div className="fin-row" key={file.webUrl}>
                <Glyph label={file.name} />
                <div className="fin-row-main">
                  <div className="fin-row-title">
                    <a href={file.webUrl} target="_blank" rel="noreferrer">
                      {file.name}
                    </a>
                  </div>
                  <div className="fin-row-sub">Modified {new Date(file.modifiedAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
