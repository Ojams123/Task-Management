import { runLoopbackOAuth } from './oauthLoopback'
import { buildMicrosoftAuthUrl, exchangeMicrosoftCode, type MicrosoftCreds } from '../../core/integrations/microsoft'

// Azure AD's "Mobile and desktop applications" platform type matches a
// registered "http://localhost" redirect URI against any port, so this can
// use a random port each time as long as the user registers it under that
// exact platform type (not "Web").
export async function connectMicrosoft(creds: MicrosoftCreds): Promise<{ refreshToken: string }> {
  const { code, redirectUri } = await runLoopbackOAuth(
    (uri) => buildMicrosoftAuthUrl(creds.clientId, uri),
    0,
    'localhost'
  )
  const token = await exchangeMicrosoftCode(creds, redirectUri, code)
  if (!token.refreshToken) {
    throw new Error('Microsoft did not return a refresh token — make sure the "offline_access" scope was granted.')
  }
  return { refreshToken: token.refreshToken }
}
