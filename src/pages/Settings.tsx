import { useEffect, useState } from 'react'
import { IS_ELECTRON } from '../bootstrap'
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

  const [anthropicKey, setAnthropicKey] = useState('')
  const [assistantConfigured, setAssistantConfigured] = useState(false)
  const [assistantSaved, setAssistantSaved] = useState(false)

  useEffect(() => {
    window.api.canvas.getSettings().then((s) => {
      if (s) {
        setCanvasDomain(s.domain)
        setCanvasToken(s.token)
      }
    })
    window.api.notifications.getGoogleAuthStatus().then(setGoogleStatus)
    window.api.assistant.getStatus().then((s) => setAssistantConfigured(s.configured))

    // Browser mode: Google redirects back here after the consent screen
    // (?google=connected or ?google=error) rather than resolving a promise.
    const params = new URLSearchParams(window.location.search)
    const googleResult = params.get('google')
    if (googleResult) {
      window.history.replaceState({}, '', window.location.pathname)
      if (googleResult === 'error') {
        setGoogleError('Google connection failed — check your client ID/secret and redirect URI, then try again.')
      } else {
        window.api.notifications.getGoogleAuthStatus().then(setGoogleStatus)
      }
    }
  }, [])

  async function saveAssistantKey() {
    await window.api.assistant.saveApiKey(anthropicKey.trim())
    setAssistantConfigured(true)
    setAssistantSaved(true)
    setTimeout(() => setAssistantSaved(false), 2000)
  }

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
        <h3>Google (Gmail + Calendar)</h3>
        {IS_ELECTRON ? (
          <p className="muted" style={{ marginBottom: 12 }}>
            Create an OAuth client (type "Desktop app") in Google Cloud Console with the Gmail API and Calendar
            API both enabled, then paste the client ID and secret below. This one connection powers both the
            missed-notifications summary (unread-message metadata only, never full email bodies) and the
            Calendar page (upcoming events).
          </p>
        ) : (
          <p className="muted" style={{ marginBottom: 12 }}>
            Create an OAuth client (type <strong>"Web application"</strong>, not "Desktop app") in Google Cloud
            Console with the Gmail API and Calendar API both enabled. Add this exact Authorized redirect URI:{' '}
            <code>{window.location.origin}/api/google/callback</code>. Then paste the client ID and secret
            below. This one connection powers both the missed-notifications summary (unread-message metadata
            only, never full email bodies) and the Calendar page (upcoming events).
          </p>
        )}
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

      <div className="card settings-section">
        <h3>Built-in assistant</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          The assistant uses your own Anthropic API key — get one at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          . It's stored encrypted, only used to call the Claude API directly from your device, and can create
          reminders, goals, transactions, and fitness entries when you ask it to.
        </p>
        {assistantConfigured && (
          <p className="muted" style={{ marginBottom: 10 }}>
            An API key is currently saved.
          </p>
        )}
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Anthropic API key</label>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-…"
          />
        </div>
        <button className="btn btn-primary" onClick={saveAssistantKey}>
          Save API key
        </button>
        {assistantSaved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
      </div>
    </div>
  )
}
