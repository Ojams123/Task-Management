import { useEffect, useState } from 'react'
import { IS_ELECTRON } from '../bootstrap'
import type { GoogleAuthStatus } from '../shared/types'
import { CanvasIcon, ClaudeIcon, GmailIcon, GoogleCalendarIcon, OuraIcon, PlaidIcon } from '../components/icons'

export function Settings() {
  const [name, setName] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

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

  const [ouraToken, setOuraToken] = useState('')
  const [ouraConfigured, setOuraConfigured] = useState(false)
  const [ouraSaved, setOuraSaved] = useState(false)

  const [plaidClientId, setPlaidClientId] = useState('')
  const [plaidSecret, setPlaidSecret] = useState('')
  const [plaidEnvironment, setPlaidEnvironment] = useState('sandbox')
  const [plaidConfigured, setPlaidConfigured] = useState(false)
  const [plaidSaved, setPlaidSaved] = useState(false)

  useEffect(() => {
    window.api.profile.getName().then((n) => setName(n ?? ''))
    window.api.canvas.getSettings().then((s) => {
      if (s) {
        setCanvasDomain(s.domain)
        setCanvasToken(s.token)
      }
    })
    window.api.notifications.getGoogleAuthStatus().then(setGoogleStatus)
    window.api.assistant.getStatus().then((s) => setAssistantConfigured(s.configured))
    window.api.oura.getStatus().then((s) => setOuraConfigured(s.configured))
    window.api.plaid.getSettings().then((s) => {
      setPlaidConfigured(s.configured)
      setPlaidEnvironment(s.environment)
    })

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

  async function saveName() {
    await window.api.profile.setName(name.trim())
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function saveAssistantKey() {
    await window.api.assistant.saveApiKey(anthropicKey.trim())
    setAssistantConfigured(true)
    setAssistantSaved(true)
    setTimeout(() => setAssistantSaved(false), 2000)
  }

  async function saveOuraToken() {
    await window.api.oura.saveToken(ouraToken.trim())
    setOuraConfigured(true)
    setOuraSaved(true)
    setTimeout(() => setOuraSaved(false), 2000)
  }

  async function savePlaidSettings() {
    await window.api.plaid.saveSettings({
      clientId: plaidClientId.trim(),
      secret: plaidSecret.trim(),
      environment: plaidEnvironment,
    })
    setPlaidConfigured(true)
    setPlaidSaved(true)
    setTimeout(() => setPlaidSaved(false), 2000)
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
        <h3>Profile</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Used for the greeting on your Dashboard (e.g. "Good morning, {name || 'Name'}").
        </p>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Your name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Oscar" />
        </div>
        <button className="btn btn-primary" onClick={saveName}>
          Save name
        </button>
        {nameSaved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
      </div>

      <div className="card settings-section">
        <h3>
          <span className="heading-with-icon">
            <CanvasIcon size={20} />
            Canvas LMS
          </span>
        </h3>
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
        <h3>
          <span className="heading-with-icon">
            <GmailIcon size={20} />
            <GoogleCalendarIcon size={20} />
            Google (Gmail + Calendar)
          </span>
        </h3>
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
        <h3>
          <span className="heading-with-icon">
            <ClaudeIcon size={20} />
            Built-in assistant
          </span>
        </h3>
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

      <div className="card settings-section">
        <h3>
          <span className="heading-with-icon">
            <OuraIcon size={20} />
            Oura Ring
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Get a personal access token at{' '}
          <a href="https://cloud.ouraring.com/personal-access-tokens" target="_blank" rel="noreferrer">
            cloud.ouraring.com/personal-access-tokens
          </a>{' '}
          (sign in with your Oura account, click "Create New Personal Access Token"). Paste it below to pull in
          your sleep, readiness, and activity scores on the Fitness page.
        </p>
        {ouraConfigured && (
          <p className="muted" style={{ marginBottom: 10 }}>
            A token is currently saved.
          </p>
        )}
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Personal access token</label>
          <input
            type="password"
            value={ouraToken}
            onChange={(e) => setOuraToken(e.target.value)}
            placeholder="Paste your Oura personal access token"
          />
        </div>
        <button className="btn btn-primary" onClick={saveOuraToken}>
          Save Oura token
        </button>
        {ouraSaved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
      </div>

      <div className="card settings-section">
        <h3>
          <span className="heading-with-icon">
            <PlaidIcon size={20} />
            Bank accounts (via Plaid)
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Rocket Money doesn't have a public API, but Plaid — the same bank-data aggregator Rocket Money uses
          under the hood — does. Create a free app at{' '}
          <a href="https://dashboard.plaid.com/signup" target="_blank" rel="noreferrer">
            dashboard.plaid.com
          </a>
          , copy your client ID and secret for the environment you want, and paste them below. Then go to{' '}
          <strong>Budget</strong> to connect a bank account.
        </p>
        {plaidConfigured && (
          <p className="muted" style={{ marginBottom: 10 }}>
            Plaid credentials are currently saved.
          </p>
        )}
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Client ID</label>
          <input value={plaidClientId} onChange={(e) => setPlaidClientId(e.target.value)} placeholder="6123abc..." />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Secret</label>
          <input
            type="password"
            value={plaidSecret}
            onChange={(e) => setPlaidSecret(e.target.value)}
            placeholder="Paste your Plaid secret"
          />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Environment</label>
          <select value={plaidEnvironment} onChange={(e) => setPlaidEnvironment(e.target.value)}>
            <option value="sandbox">Sandbox (test data)</option>
            <option value="development">Development (real accounts)</option>
            <option value="production">Production</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={savePlaidSettings}>
          Save Plaid settings
        </button>
        {plaidSaved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
      </div>
    </div>
  )
}
