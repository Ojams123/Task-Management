import { useEffect, useState } from 'react'
import { IS_ELECTRON } from '../bootstrap'
import { debugListVoices } from '../voice/speak'
import type { AssistantProvider, GoogleAuthStatus, LinkedInProfile } from '../shared/types'
import {
  CanvasIcon,
  ClaudeIcon,
  CloudSunIcon,
  GmailIcon,
  GoogleCalendarIcon,
  LinkedInIcon,
  MicrosoftIcon,
  OpenAIIcon,
  OuraIcon,
  PlaidIcon,
  SpotifyIcon,
  StravaIcon,
} from '../components/icons'

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

  const [assistantProvider, setAssistantProvider] = useState<AssistantProvider>('anthropic')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicConfigured, setAnthropicConfigured] = useState(false)
  const [openaiConfigured, setOpenaiConfigured] = useState(false)
  const [assistantSaved, setAssistantSaved] = useState(false)
  const [managedAgentId, setManagedAgentId] = useState('')
  const [managedAgentEnvId, setManagedAgentEnvId] = useState('')
  const [managedAgentConfigured, setManagedAgentConfigured] = useState(false)
  const [managedAgentSaved, setManagedAgentSaved] = useState(false)
  const [managedAgentError, setManagedAgentError] = useState<string | null>(null)
  const [voiceList, setVoiceList] = useState<{ name: string; lang: string; score: number }[] | null>(null)

  const [ouraToken, setOuraToken] = useState('')
  const [ouraConfigured, setOuraConfigured] = useState(false)
  const [ouraSaved, setOuraSaved] = useState(false)

  const [weatherApiKey, setWeatherApiKey] = useState('')
  const [weatherLocation, setWeatherLocation] = useState('')
  const [weatherConfigured, setWeatherConfigured] = useState(false)
  const [weatherSaved, setWeatherSaved] = useState(false)

  const [spotifyClientId, setSpotifyClientId] = useState('')
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('')
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const [spotifyName, setSpotifyName] = useState<string | null>(null)
  const [spotifyConnecting, setSpotifyConnecting] = useState(false)
  const [spotifyError, setSpotifyError] = useState<string | null>(null)

  const [stravaClientId, setStravaClientId] = useState('')
  const [stravaClientSecret, setStravaClientSecret] = useState('')
  const [stravaConnected, setStravaConnected] = useState(false)
  const [stravaName, setStravaName] = useState<string | null>(null)
  const [stravaConnecting, setStravaConnecting] = useState(false)
  const [stravaError, setStravaError] = useState<string | null>(null)

  const [microsoftClientId, setMicrosoftClientId] = useState('')
  const [microsoftClientSecret, setMicrosoftClientSecret] = useState('')
  const [microsoftConnected, setMicrosoftConnected] = useState(false)
  const [microsoftName, setMicrosoftName] = useState<string | null>(null)
  const [microsoftConnecting, setMicrosoftConnecting] = useState(false)
  const [microsoftError, setMicrosoftError] = useState<string | null>(null)

  const [linkedinClientId, setLinkedinClientId] = useState('')
  const [linkedinClientSecret, setLinkedinClientSecret] = useState('')
  const [linkedinProfile, setLinkedinProfile] = useState<LinkedInProfile | null>(null)
  const [linkedinConnecting, setLinkedinConnecting] = useState(false)
  const [linkedinError, setLinkedinError] = useState<string | null>(null)

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
    window.api.assistant.getStatus().then((s) => {
      setAssistantProvider(s.provider)
      setAnthropicConfigured(s.anthropicConfigured)
      setOpenaiConfigured(s.openaiConfigured)
      setManagedAgentConfigured(s.managedAgentConfigured)
      if (s.managedAgentId) setManagedAgentId(s.managedAgentId)
      if (s.managedAgentEnvironmentId) setManagedAgentEnvId(s.managedAgentEnvironmentId)
    })
    window.api.oura.getStatus().then((s) => setOuraConfigured(s.configured))
    window.api.plaid.getSettings().then((s) => {
      setPlaidConfigured(s.configured)
      setPlaidEnvironment(s.environment)
    })
    window.api.weather.getSettings().then((s) => {
      setWeatherConfigured(s.configured)
      setWeatherLocation(s.location)
    })
    window.api.spotify.getStatus().then((s) => {
      setSpotifyConnected(s.connected)
      setSpotifyName(s.displayName)
    })
    window.api.strava.getStatus().then((s) => {
      setStravaConnected(s.connected)
      setStravaName(s.athleteName)
    })
    window.api.microsoft.getStatus().then((s) => {
      setMicrosoftConnected(s.connected)
      setMicrosoftName(s.displayName)
    })
    window.api.linkedin.getProfile().then(setLinkedinProfile)

    // Browser mode: Google/Spotify/Strava/Microsoft/LinkedIn redirect back
    // here after their consent screens (?google=connected or
    // ?spotify=error, etc) rather than resolving a promise.
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
    const spotifyResult = params.get('spotify')
    if (spotifyResult) {
      window.history.replaceState({}, '', window.location.pathname)
      if (spotifyResult === 'error') {
        setSpotifyError('Spotify connection failed — check your client ID/secret and redirect URI, then try again.')
      } else {
        window.api.spotify.getStatus().then((s) => {
          setSpotifyConnected(s.connected)
          setSpotifyName(s.displayName)
        })
      }
    }
    const stravaResult = params.get('strava')
    if (stravaResult) {
      window.history.replaceState({}, '', window.location.pathname)
      if (stravaResult === 'error') {
        setStravaError('Strava connection failed — check your client ID/secret and redirect URI, then try again.')
      } else {
        window.api.strava.getStatus().then((s) => {
          setStravaConnected(s.connected)
          setStravaName(s.athleteName)
        })
      }
    }
    const microsoftResult = params.get('microsoft')
    if (microsoftResult) {
      window.history.replaceState({}, '', window.location.pathname)
      if (microsoftResult === 'error') {
        setMicrosoftError('Microsoft connection failed — check your client ID/secret and redirect URI, then try again.')
      } else {
        window.api.microsoft.getStatus().then((s) => {
          setMicrosoftConnected(s.connected)
          setMicrosoftName(s.displayName)
        })
      }
    }
    const linkedinResult = params.get('linkedin')
    if (linkedinResult) {
      window.history.replaceState({}, '', window.location.pathname)
      if (linkedinResult === 'error') {
        setLinkedinError('LinkedIn connection failed — check your client ID/secret and redirect URI, then try again.')
      } else {
        window.api.linkedin.getProfile().then(setLinkedinProfile)
      }
    }
  }, [])

  async function saveName() {
    await window.api.profile.setName(name.trim())
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  async function saveAssistantKey(provider: AssistantProvider) {
    const key = provider === 'openai' ? openaiKey : anthropicKey
    await window.api.assistant.saveApiKey(provider, key.trim())
    if (provider === 'openai') setOpenaiConfigured(true)
    else setAnthropicConfigured(true)
    setAssistantSaved(true)
    setTimeout(() => setAssistantSaved(false), 2000)
  }

  async function selectAssistantProvider(provider: AssistantProvider) {
    setAssistantProvider(provider)
    await window.api.assistant.setProvider(provider)
  }

  async function saveManagedAgentConfig() {
    setManagedAgentError(null)
    const agentId = managedAgentId.trim()
    const environmentId = managedAgentEnvId.trim()
    if (!agentId || !environmentId) {
      setManagedAgentError('Both Agent ID and Environment ID are required.')
      return
    }
    try {
      await window.api.assistant.saveManagedAgentConfig(agentId, environmentId)
      setManagedAgentConfigured(true)
      setManagedAgentSaved(true)
      setTimeout(() => setManagedAgentSaved(false), 2000)
    } catch (e) {
      setManagedAgentError(e instanceof Error ? e.message : 'Failed to save agent config')
    }
  }

  async function saveOuraToken() {
    await window.api.oura.saveToken(ouraToken.trim())
    setOuraConfigured(true)
    setOuraSaved(true)
    setTimeout(() => setOuraSaved(false), 2000)
  }

  async function saveSpotifyCredentials() {
    await window.api.spotify.saveCredentials(spotifyClientId.trim(), spotifyClientSecret.trim())
  }

  async function connectSpotify() {
    setSpotifyConnecting(true)
    setSpotifyError(null)
    try {
      await saveSpotifyCredentials()
      const status = await window.api.spotify.connect()
      setSpotifyConnected(status.connected)
      setSpotifyName(status.displayName)
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setSpotifyConnecting(false)
    }
  }

  async function disconnectSpotify() {
    await window.api.spotify.disconnect()
    setSpotifyConnected(false)
    setSpotifyName(null)
  }

  async function saveStravaCredentials() {
    await window.api.strava.saveCredentials(stravaClientId.trim(), stravaClientSecret.trim())
  }

  async function connectStrava() {
    setStravaConnecting(true)
    setStravaError(null)
    try {
      await saveStravaCredentials()
      const status = await window.api.strava.connect()
      setStravaConnected(status.connected)
      setStravaName(status.athleteName)
    } catch (e) {
      setStravaError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setStravaConnecting(false)
    }
  }

  async function disconnectStrava() {
    await window.api.strava.disconnect()
    setStravaConnected(false)
    setStravaName(null)
  }

  async function saveMicrosoftCredentials() {
    await window.api.microsoft.saveCredentials(microsoftClientId.trim(), microsoftClientSecret.trim())
  }

  async function connectMicrosoft() {
    setMicrosoftConnecting(true)
    setMicrosoftError(null)
    try {
      await saveMicrosoftCredentials()
      const status = await window.api.microsoft.connect()
      setMicrosoftConnected(status.connected)
      setMicrosoftName(status.displayName)
    } catch (e) {
      setMicrosoftError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setMicrosoftConnecting(false)
    }
  }

  async function disconnectMicrosoft() {
    await window.api.microsoft.disconnect()
    setMicrosoftConnected(false)
    setMicrosoftName(null)
  }

  async function saveLinkedinCredentials() {
    await window.api.linkedin.saveCredentials(linkedinClientId.trim(), linkedinClientSecret.trim())
  }

  async function connectLinkedin() {
    setLinkedinConnecting(true)
    setLinkedinError(null)
    try {
      await saveLinkedinCredentials()
      setLinkedinProfile(await window.api.linkedin.connect())
    } catch (e) {
      setLinkedinError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLinkedinConnecting(false)
    }
  }

  async function disconnectLinkedin() {
    await window.api.linkedin.disconnect()
    setLinkedinProfile(null)
  }

  async function saveWeatherSettings() {
    await window.api.weather.saveSettings({ apiKey: weatherApiKey.trim(), location: weatherLocation.trim() })
    setWeatherConfigured(true)
    setWeatherSaved(true)
    setTimeout(() => setWeatherSaved(false), 2000)
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
            <SpotifyIcon size={20} />
            Spotify
          </span>
        </h3>
        {IS_ELECTRON ? (
          <p className="muted" style={{ marginBottom: 12 }}>
            Create an app at{' '}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              developer.spotify.com/dashboard
            </a>
            . Unlike Google, Spotify requires an exact redirect URI match — add exactly{' '}
            <code>http://127.0.0.1:43817/oauth2callback</code>, then paste the client ID and secret below.
          </p>
        ) : (
          <p className="muted" style={{ marginBottom: 12 }}>
            Create an app at{' '}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              developer.spotify.com/dashboard
            </a>
            . Add this exact Redirect URI: <code>{window.location.origin}/api/spotify/callback</code>. Then paste
            the client ID and secret below.
          </p>
        )}
        {spotifyConnected ? (
          <div>
            <p>
              Connected{spotifyName ? ` as ${spotifyName}` : ''}.
            </p>
            <button className="btn btn-danger" onClick={disconnectSpotify}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Client ID</label>
              <input value={spotifyClientId} onChange={(e) => setSpotifyClientId(e.target.value)} placeholder="Spotify client ID" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Client secret</label>
              <input
                type="password"
                value={spotifyClientSecret}
                onChange={(e) => setSpotifyClientSecret(e.target.value)}
                placeholder="Client secret"
              />
            </div>
            <button className="btn btn-primary" onClick={connectSpotify} disabled={spotifyConnecting}>
              {spotifyConnecting ? 'Connecting…' : 'Connect Spotify account'}
            </button>
            {spotifyError && (
              <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
                {spotifyError}
              </p>
            )}
          </>
        )}
      </div>

      <div className="card settings-section">
        <h3>
          <span className="heading-with-icon">
            <StravaIcon size={20} />
            Strava
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Create an app at{' '}
          <a href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">
            strava.com/settings/api
          </a>
          . Set the "Authorization Callback Domain" to{' '}
          <code>{IS_ELECTRON ? 'localhost' : new URL(window.location.origin).hostname}</code>, then paste the
          client ID and secret below.
        </p>
        {stravaConnected ? (
          <div>
            <p>
              Connected{stravaName ? ` as ${stravaName}` : ''}.
            </p>
            <button className="btn btn-danger" onClick={disconnectStrava}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Client ID</label>
              <input value={stravaClientId} onChange={(e) => setStravaClientId(e.target.value)} placeholder="Strava client ID" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Client secret</label>
              <input
                type="password"
                value={stravaClientSecret}
                onChange={(e) => setStravaClientSecret(e.target.value)}
                placeholder="Client secret"
              />
            </div>
            <button className="btn btn-primary" onClick={connectStrava} disabled={stravaConnecting}>
              {stravaConnecting ? 'Connecting…' : 'Connect Strava account'}
            </button>
            {stravaError && (
              <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
                {stravaError}
              </p>
            )}
          </>
        )}
      </div>

      <div className="card settings-section">
        <h3>
          <span className="heading-with-icon">
            <MicrosoftIcon size={20} />
            Microsoft 365 (Outlook + files)
          </span>
        </h3>
        {IS_ELECTRON ? (
          <p className="muted" style={{ marginBottom: 12 }}>
            Register an app at{' '}
            <a href="https://portal.azure.com" target="_blank" rel="noreferrer">
              portal.azure.com
            </a>{' '}
            → App registrations. Add a platform of type <strong>"Mobile and desktop applications"</strong> with
            redirect URI exactly <code>http://localhost</code> (Azure matches that against any port). Under API
            permissions add <code>Mail.Read</code>, <code>Files.Read.All</code>, and <code>User.Read</code>
            (delegated), then create a client secret under "Certificates & secrets". Paste both below. This one
            connection powers unread Outlook mail and recent Word/Excel/PowerPoint files.
          </p>
        ) : (
          <p className="muted" style={{ marginBottom: 12 }}>
            Register an app at{' '}
            <a href="https://portal.azure.com" target="_blank" rel="noreferrer">
              portal.azure.com
            </a>{' '}
            → App registrations. Add a platform of type <strong>"Web"</strong> with this exact redirect URI:{' '}
            <code>{window.location.origin}/api/microsoft/callback</code>. Under API permissions add{' '}
            <code>Mail.Read</code>, <code>Files.Read.All</code>, and <code>User.Read</code> (delegated), then
            create a client secret under "Certificates & secrets". Paste both below.
          </p>
        )}
        {microsoftConnected ? (
          <div>
            <p>
              Connected{microsoftName ? ` as ${microsoftName}` : ''}.
            </p>
            <button className="btn btn-danger" onClick={disconnectMicrosoft}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Application (client) ID</label>
              <input
                value={microsoftClientId}
                onChange={(e) => setMicrosoftClientId(e.target.value)}
                placeholder="Application (client) ID"
              />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Client secret</label>
              <input
                type="password"
                value={microsoftClientSecret}
                onChange={(e) => setMicrosoftClientSecret(e.target.value)}
                placeholder="Client secret value"
              />
            </div>
            <button className="btn btn-primary" onClick={connectMicrosoft} disabled={microsoftConnecting}>
              {microsoftConnecting ? 'Connecting…' : 'Connect Microsoft account'}
            </button>
            {microsoftError && (
              <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
                {microsoftError}
              </p>
            )}
          </>
        )}
      </div>

      <div className="card settings-section">
        <h3>
          <span className="heading-with-icon">
            <LinkedInIcon size={20} />
            LinkedIn
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          LinkedIn's public API only allows basic sign-in for ordinary developer apps — this will only ever show
          your name, email, and photo, never your feed, connections, or activity (that requires a partnership
          tier LinkedIn doesn't grant to personal projects). Create an app at{' '}
          <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer">
            linkedin.com/developers/apps
          </a>
          , request the "Sign In with LinkedIn using OpenID Connect" product, and add this exact redirect URL:{' '}
          <code>
            {IS_ELECTRON ? 'http://127.0.0.1:43819/oauth2callback' : `${window.location.origin}/api/linkedin/callback`}
          </code>
          .
        </p>
        {linkedinProfile ? (
          <div>
            <p>Connected as {linkedinProfile.name}.</p>
            <button className="btn btn-danger" onClick={disconnectLinkedin}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Client ID</label>
              <input value={linkedinClientId} onChange={(e) => setLinkedinClientId(e.target.value)} placeholder="LinkedIn client ID" />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Client secret</label>
              <input
                type="password"
                value={linkedinClientSecret}
                onChange={(e) => setLinkedinClientSecret(e.target.value)}
                placeholder="Client secret"
              />
            </div>
            <button className="btn btn-primary" onClick={connectLinkedin} disabled={linkedinConnecting}>
              {linkedinConnecting ? 'Connecting…' : 'Connect LinkedIn account'}
            </button>
            {linkedinError && (
              <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
                {linkedinError}
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
          The assistant can use Anthropic (Claude), OpenAI (ChatGPT), or your own Managed Agent on
          platform.claude.com — bring your own API key for whichever you prefer. It's stored encrypted, only used
          to call that provider's API directly from your device, and can create reminders, goals, transactions,
          fitness entries, calendar events, and more when you ask it to.
        </p>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>Active provider</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${assistantProvider === 'anthropic' ? 'btn-primary' : 'btn-sm'}`}
              onClick={() => selectAssistantProvider('anthropic')}
            >
              <span className="heading-with-icon">
                <ClaudeIcon size={16} />
                Anthropic (Claude)
              </span>
            </button>
            <button
              type="button"
              className={`btn ${assistantProvider === 'openai' ? 'btn-primary' : 'btn-sm'}`}
              onClick={() => selectAssistantProvider('openai')}
            >
              <span className="heading-with-icon">
                <OpenAIIcon size={16} />
                OpenAI (ChatGPT)
              </span>
            </button>
            <button
              type="button"
              className={`btn ${assistantProvider === 'managed-agent' ? 'btn-primary' : 'btn-sm'}`}
              onClick={() => selectAssistantProvider('managed-agent')}
            >
              <span className="heading-with-icon">
                <ClaudeIcon size={16} />
                My Agent (Managed)
              </span>
            </button>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 10 }}>
          <label>Anthropic API key</label>
          <input
            type="password"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-…"
          />
        </div>
        <button className="btn btn-primary" onClick={() => saveAssistantKey('anthropic')}>
          Save Anthropic key
        </button>
        {anthropicConfigured && (
          <span className="muted" style={{ marginLeft: 10 }}>
            A key is saved.
          </span>
        )}
        <p className="muted" style={{ margin: '6px 0 16px' }}>
          Get one at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          .
        </p>

        <div className="field" style={{ marginBottom: 10 }}>
          <label>OpenAI API key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-…"
          />
        </div>
        <button className="btn btn-primary" onClick={() => saveAssistantKey('openai')}>
          Save OpenAI key
        </button>
        {openaiConfigured && (
          <span className="muted" style={{ marginLeft: 10 }}>
            A key is saved.
          </span>
        )}
        <p className="muted" style={{ margin: '6px 0 0' }}>
          Get one at{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
            platform.openai.com/api-keys
          </a>
          .
        </p>

        {assistantSaved && (
          <p className="muted" style={{ marginTop: 10 }}>
            Saved.
          </p>
        )}

        {assistantProvider === 'managed-agent' && (
          <>
            <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
            <p className="muted" style={{ marginBottom: 12 }}>
              This uses the Anthropic API key above to connect to a Managed Agent you built at{' '}
              <a href="https://platform.claude.com" target="_blank" rel="noreferrer">
                platform.claude.com
              </a>{' '}
              — it keeps your agent's own model/system prompt, and gives it DeviceHub's own tools (reminders,
              goals, budget, calendar, etc.) for the session, plus general web research. Requires a one-time
              Environment created on your Anthropic account.
            </p>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Agent ID</label>
              <input
                value={managedAgentId}
                onChange={(e) => setManagedAgentId(e.target.value)}
                placeholder="agent_..."
              />
            </div>
            <div className="field" style={{ marginBottom: 10 }}>
              <label>Environment ID</label>
              <input
                value={managedAgentEnvId}
                onChange={(e) => setManagedAgentEnvId(e.target.value)}
                placeholder="env_..."
              />
            </div>
            <button className="btn btn-primary" onClick={saveManagedAgentConfig}>
              Save agent config
            </button>
            {managedAgentConfigured && (
              <span className="muted" style={{ marginLeft: 10 }}>
                Configured.
              </span>
            )}
            {managedAgentSaved && (
              <p className="muted" style={{ marginTop: 10 }}>
                Saved.
              </p>
            )}
            {managedAgentError && (
              <p className="muted" style={{ color: 'var(--danger)', marginTop: 10 }}>
                {managedAgentError}
              </p>
            )}
          </>
        )}

        <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
        <p className="muted" style={{ marginBottom: 10 }}>
          Spoken replies use whatever text-to-speech voices this device has installed — DeviceHub can't add new
          voices itself. If replies don't sound like you expect, check what this browser can actually see:
        </p>
        <button className="btn btn-sm" onClick={() => debugListVoices().then(setVoiceList)}>
          Check available voices
        </button>
        {voiceList && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            {voiceList.length === 0 ? (
              <p className="muted">This browser reports no speech voices at all.</p>
            ) : (
              <>
                <p className="muted" style={{ marginBottom: 6 }}>
                  Currently picked: <strong>{voiceList[0].name}</strong> ({voiceList[0].lang})
                </p>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  {voiceList.map((v, i) => (
                    <div
                      key={`${v.name}-${v.lang}`}
                      style={{
                        padding: '4px 8px',
                        borderBottom: i < voiceList.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{v.name}</span>
                      <span className="muted">{v.lang}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card settings-section">
        <h3>
          <span className="heading-with-icon">
            <CloudSunIcon size={20} />
            Weather
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Get a free API key at{' '}
          <a href="https://openweathermap.org/api" target="_blank" rel="noreferrer">
            openweathermap.org/api
          </a>{' '}
          (the "Current Weather" plan is free). Enter your city as "City, State" or "City, Country" (e.g.
          "Portland, OR" or "London, GB").
        </p>
        {weatherConfigured && (
          <p className="muted" style={{ marginBottom: 10 }}>
            Weather is currently configured.
          </p>
        )}
        <div className="field" style={{ marginBottom: 10 }}>
          <label>API key</label>
          <input
            type="password"
            value={weatherApiKey}
            onChange={(e) => setWeatherApiKey(e.target.value)}
            placeholder="Paste your OpenWeatherMap API key"
          />
        </div>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Location</label>
          <input
            value={weatherLocation}
            onChange={(e) => setWeatherLocation(e.target.value)}
            placeholder="Portland, OR"
          />
        </div>
        <button className="btn btn-primary" onClick={saveWeatherSettings}>
          Save weather settings
        </button>
        {weatherSaved && <span className="muted" style={{ marginLeft: 10 }}>Saved.</span>}
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
          , then under Developers → Keys request Production access (a short form, usually fast to approve for
          personal use), copy your client ID and Production secret, and paste them below. Then go to{' '}
          <strong>Budget</strong> to connect a real bank account.
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
            <option value="production">Production (real accounts)</option>
            <option value="development">Development (legacy — most new Plaid accounts don't have this)</option>
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
