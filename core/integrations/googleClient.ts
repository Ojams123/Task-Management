import { google } from 'googleapis'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function createOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/** Builds an authenticated client from a previously-obtained refresh token. */
export function clientFor(clientId: string, clientSecret: string, refreshToken: string) {
  const oauth2Client = createOAuthClient(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob')
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}
