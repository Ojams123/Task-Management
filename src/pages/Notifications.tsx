import { useEffect, useState } from 'react'
import type { GoogleAuthStatus, NotificationDigest } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { Glyph } from '../components/Glyph'

export function Notifications({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [status, setStatus] = useState<GoogleAuthStatus | null>(null)
  const [digest, setDigest] = useState<NotificationDigest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  async function refresh() {
    const s = await window.api.notifications.getGoogleAuthStatus()
    setStatus(s)
    if (s.connected) {
      setDigest(await window.api.notifications.getDigest())
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleRefresh() {
    setLoading(true)
    setError(null)
    try {
      setDigest(await window.api.notifications.refreshDigest())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh')
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    setMarkingId(id)
    setError(null)
    try {
      await window.api.notifications.markAsRead(id)
      setDigest((prev) =>
        prev
          ? { ...prev, items: prev.items.filter((i) => i.id !== id), totalUnread: Math.max(0, prev.totalUnread - 1) }
          : prev
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark as read')
    } finally {
      setMarkingId(null)
    }
  }

  if (status && !status.connected) {
    return (
      <div className="card">
        <h3>Connect an account</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Connect your Gmail account in Settings to get a summary of what you missed while away from your device.
          This covers connected accounts only — not raw SMS or OS notifications.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
          {error}
        </p>
      )}

      <div className="grid-editorial" style={{ marginBottom: 20 }}>
        <div className="card hero-card span-3">
          <h3>
            Missed while away
            <button className="btn btn-sm" onClick={handleRefresh} disabled={loading}>
              {loading ? 'Checking…' : 'Refresh'}
            </button>
          </h3>
          {!digest || digest.items.length === 0 ? (
            <div className="empty-state">You're all caught up.</div>
          ) : (
            <div className="list">
              {digest.items.map((item) => (
                <div className="fin-row" key={item.id}>
                  <Glyph label={item.from} />
                  <div className="fin-row-main">
                    <div className="fin-row-title">{item.subject}</div>
                    <div className="fin-row-sub">
                      {item.from} · {new Date(item.receivedAt).toLocaleString()}
                    </div>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {item.snippet}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm"
                    onClick={() => markAsRead(item.id)}
                    disabled={markingId === item.id}
                  >
                    {markingId === item.id ? 'Marking…' : 'Mark as read'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card span-1">
          <div className="stat">
            <span className="stat-label">Unread</span>
            <span className="hero-value" style={{ fontSize: 34 }}>{digest?.totalUnread ?? 0}</span>
          </div>
          <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
            Connected: {status?.email}
            {digest && (
              <>
                <br />
                Since {new Date(digest.sinceLastCheck).toLocaleString()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
