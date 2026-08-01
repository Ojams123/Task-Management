import { runLoopbackOAuth } from './oauthLoopback'
import {
  buildLinkedInAuthUrl,
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  type LinkedInCreds,
} from '../../core/integrations/linkedin'

// Like Spotify, LinkedIn validates the redirect URI exactly (including
// port), so this needs a fixed port matching what's registered in the
// LinkedIn app's "Authorized redirect URLs".
export const LINKEDIN_LOOPBACK_PORT = 43819

export async function connectLinkedIn(creds: LinkedInCreds) {
  const { code, redirectUri } = await runLoopbackOAuth(
    (uri) => buildLinkedInAuthUrl(creds.clientId, uri),
    LINKEDIN_LOOPBACK_PORT
  )
  const token = await exchangeLinkedInCode(creds, redirectUri, code)
  return fetchLinkedInProfile(token.accessToken)
}
