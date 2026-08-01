import { runLoopbackOAuth } from './oauthLoopback'
import { buildSpotifyAuthUrl, exchangeSpotifyCode, type SpotifyCreds } from '../../core/integrations/spotify'

// Spotify validates the redirect URI exactly (including port) — unlike
// Google/Microsoft it has no loopback-any-port allowance — so this needs a
// fixed port that matches what's registered in the Spotify app dashboard.
export const SPOTIFY_LOOPBACK_PORT = 43817

export async function connectSpotify(creds: SpotifyCreds): Promise<{ refreshToken: string }> {
  const { code, redirectUri } = await runLoopbackOAuth(
    (uri) => buildSpotifyAuthUrl(creds.clientId, uri),
    SPOTIFY_LOOPBACK_PORT
  )
  const token = await exchangeSpotifyCode(creds, redirectUri, code)
  if (!token.refreshToken) {
    throw new Error('Spotify did not return a refresh token. Try disconnecting the app at spotify.com and reconnecting.')
  }
  return { refreshToken: token.refreshToken }
}
