import { google } from 'googleapis'
import { createOAuthClient, GOOGLE_SCOPES } from '../core/integrations/googleClient'

export function buildAuthUrl(clientId: string, clientSecret: string, redirectUri: string): string {
  const client = createOAuthClient(clientId, clientSecret, redirectUri)
  return client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: GOOGLE_SCOPES })
}

export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  code: string
): Promise<{ refreshToken: string; email: string }> {
  const client = createOAuthClient(clientId, clientSecret, redirectUri)
  const { tokens } = await client.getToken(code)
  client.setCredentials(tokens)

  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Revoke access at myaccount.google.com/permissions and try connecting again.'
    )
  }

  const oauth2 = google.oauth2({ auth: client, version: 'v2' })
  const profile = await oauth2.userinfo.get()
  return { refreshToken: tokens.refresh_token, email: profile.data.email ?? 'unknown' }
}
