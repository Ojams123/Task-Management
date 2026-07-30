import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { google } from 'googleapis'
import { shell } from 'electron'
import type { EmailSummaryItem } from '../../src/shared/types'

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

function createOAuthClient(clientId: string, clientSecret: string, redirectUri: string) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Runs the OAuth "loopback" flow used by installed/desktop apps: opens the
 * consent screen in the system browser and listens on a local port for the
 * redirect carrying the authorization code.
 */
export async function runOAuthFlow(
  clientId: string,
  clientSecret: string
): Promise<{ refreshToken: string; email: string }> {
  const server = http.createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as AddressInfo).port
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`

  const oauth2Client = createOAuthClient(clientId, clientSecret, redirectUri)
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })

  const codePromise = new Promise<string>((resolve, reject) => {
    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '', redirectUri)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      if (error) {
        res.end('<h2>Authorization failed. You can close this window.</h2>')
        reject(new Error(error))
        return
      }
      res.end('<h2>Google account connected. You can close this window.</h2>')
      if (code) resolve(code)
    })
    server.on('error', reject)
  })

  await shell.openExternal(authUrl)

  const code = await codePromise
  server.close()

  const { tokens } = await oauth2Client.getToken(code)
  oauth2Client.setCredentials(tokens)

  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token. Revoke access at myaccount.google.com/permissions and try connecting again.'
    )
  }

  const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' })
  const profile = await oauth2.userinfo.get()

  return { refreshToken: tokens.refresh_token, email: profile.data.email ?? 'unknown' }
}

function clientFor(clientId: string, clientSecret: string, refreshToken: string) {
  const oauth2Client = createOAuthClient(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob')
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

export async function fetchUnreadDigest(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  sinceIso: string | null
): Promise<EmailSummaryItem[]> {
  const auth = clientFor(clientId, clientSecret, refreshToken)
  const gmail = google.gmail({ version: 'v1', auth })

  const query = sinceIso
    ? `is:unread after:${Math.floor(new Date(sinceIso).getTime() / 1000)}`
    : 'is:unread'

  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 25 })
  const messages = list.data.messages ?? []

  const items: EmailSummaryItem[] = []
  for (const msg of messages) {
    if (!msg.id) continue
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    })
    const headers = full.data.payload?.headers ?? []
    const from = headers.find((h) => h.name === 'From')?.value ?? 'Unknown sender'
    const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
    const date = headers.find((h) => h.name === 'Date')?.value
    items.push({
      id: msg.id,
      from,
      subject,
      receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      snippet: full.data.snippet ?? '',
    })
  }

  return items
}
