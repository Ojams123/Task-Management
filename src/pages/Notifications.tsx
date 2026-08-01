import { useEffect, useState } from 'react'
import type { GoogleAuthStatus, NotificationDigest } from '../shared/types'
import type { Page } from '../components/Sidebar'

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
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600 }}>Connected: {status?.email}</div>
            {digest && (
              <div className="muted">
                Since {new Date(digest.sinceLastCheck).toLocaleString()} — {digest.totalUnread} unread
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        </div>
        {error && (
          <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
            {error}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Missed while away</h3>
        {!digest || digest.items.length === 0 ? (
          <div className="empty-state">You're all caught up.</div>
        ) : (
          <div className="list">
            {digest.items.map((item) => (
              <div className="list-row" key={item.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{item.subject}</div>
                  <div className="list-row-sub">
                    {item.from} · {new Date(item.receivedAt).toLocaleString()}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {item.snippet}
                  </div>
                </div>
                <div className="list-row-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => markAsRead(item.id)}
                    disabled={markingId === item.id}
                  >
                    {markingId === item.id ? 'Marking…' : 'Mark as read'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
