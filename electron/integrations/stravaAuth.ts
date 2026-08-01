import { runLoopbackOAuth } from './oauthLoopback'
import { buildStravaAuthUrl, exchangeStravaCode, type StravaCreds } from '../../core/integrations/strava'

// Strava's "Authorization Callback Domain" setting validates only the host
// (e.g. "localhost"), not the full URI, so any free port on that host works.
export async function connectStrava(creds: StravaCreds): Promise<{ refreshToken: string }> {
  const { code, redirectUri } = await runLoopbackOAuth(
    (uri) => buildStravaAuthUrl(creds.clientId, uri),
    0,
    'localhost'
  )
  const token = await exchangeStravaCode(creds, redirectUri, code)
  if (!token.refreshToken) {
    throw new Error('Strava did not return a refresh token. Try disconnecting the app at strava.com and reconnecting.')
  }
  return { refreshToken: token.refreshToken }
}
