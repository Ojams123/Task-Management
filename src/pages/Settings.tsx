import { useEffect, useState } from 'react'
import type { GoogleAuthStatus } from '../shared/types'

export function Settings() {
  const [canvasDomain, setCanvasDomain] = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [canvasSaved, setCanvasSaved] = useState(false)

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [googleStatus, setGoogleStatus] = useState<GoogleAuthStatus | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)

  useEffect(() => {
    window.api.canvas.getSettings().then((s) => {
      if (s) {
        setCanvasDomain(s.domain)
        setCanvasToken(s.token)
      }
    })
    window.api.notifications.getGoogleAuthStatus().then(setGoogleStatus)
  }, [])

  async function saveCanvas() {
    await window.api.canvas.saveSettings({ domain: canvasDomain.trim(), token: canvasToken.trim() })
    setCanvasSaved(true)
    setTimeout(() => setCanvasSaved(false), 2000)
  }

  async function saveGoogleCredentials() {
    await window.api.notifications.saveGoogleCredentials(clientId.trim(), clientSecret.trim())
  }

  async function connectGoogle() {
    setConnecting(true)
    setGoogleError(null)
    try {
      await saveGoogleCredentials()
      const status = await window.api.notifications.connectGoogle()
      setGoogleStatus(status)
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  async function disconnectGoogle() {
    await window.api.notifications.disconnectGoogle()
    setGoogleStatus({ connected: false, email: null })
  }

  return (
    <div>
      <div className="card settings-section">
        <h3>Canvas LMS</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Find your domain in the browser address bar when logged into Canvas (e.g.{' '}
          <code>yourschool.instructure.com</code>). Generate an access token under Account → Settings → New
          Access Token.
        </p>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Canvas domain</label>
          <input
            value={canvasDomain}
            onChange={(e) => setCanvasDomain(e.target.value)}
            placeholder="yourschool.instructure.com"
          />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Access token</label>
          <input
            type="password"
            value={canvasToken}
            onChange={(e) => setCanvasToken(e.target.value)}
            placeholder="Paste your Canvas access token"
          />
        </div>
        <button className="btn btn-primary" onClick={saveCanvas}>
          Save Canvas settings
        </button>
        {canvasSaved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
      </div>

      <div className="card settings-section">
        <h3>Gmail notifications</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Create an OAuth client (type "Desktop app") in Google Cloud Console with the Gmail API enabled, then
          paste the client ID and secret below. Your email content stays local — DeviceHub only reads
          unread-message metadata to build your missed-notifications summary.
        </p>
        {googleStatus?.connected ? (
          <div>
            <p>
              Connected as <strong>{googleStatus.email}</strong>
            </p>
            <button className="btn btn-danger" onClick={disconnectGoogle}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>OAuth client ID</label>
              <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>OAuth client secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Client secret"
              />
            </div>
            <button className="btn btn-primary" onClick={connectGoogle} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect Google account'}
            </button>
            {googleError && (
              <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
                {googleError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
