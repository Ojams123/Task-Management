import { buildAuthorizeUrl, exchangeCode, refreshAccessToken } from './oauth2'

const AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const SCOPE = 'offline_access Mail.Read Files.Read.All User.Read'
const GRAPH_URL = 'https://graph.microsoft.com/v1.0'

export interface MicrosoftCreds {
  clientId: string
  clientSecret: string
}

export function buildMicrosoftAuthUrl(clientId: string, redirectUri: string): string {
  return buildAuthorizeUrl(AUTHORIZE_URL, {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: SCOPE,
  })
}

export function exchangeMicrosoftCode(creds: MicrosoftCreds, redirectUri: string, code: string) {
  return exchangeCode({
    tokenUrl: TOKEN_URL,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri,
    code,
  })
}

async function getAccessToken(creds: MicrosoftCreds, refreshToken: string): Promise<string> {
  const token = await refreshAccessToken({
    tokenUrl: TOKEN_URL,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    refreshToken,
  })
  return token.accessToken
}

export interface MicrosoftMailItem {
  from: string
  subject: string
  receivedAt: string
}

export interface MicrosoftFileItem {
  name: string
  webUrl: string
  modifiedAt: string
}

export interface MicrosoftSnapshot {
  displayName: string
  unreadCount: number
  unreadItems: MicrosoftMailItem[]
  recentFiles: MicrosoftFileItem[]
}

async function graphFetch<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH_URL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Microsoft Graph error ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchMicrosoftSnapshot(creds: MicrosoftCreds, refreshToken: string): Promise<MicrosoftSnapshot> {
  const accessToken = await getAccessToken(creds, refreshToken)

  const profile = await graphFetch<{ displayName: string }>(accessToken, '/me')

  const mail = await graphFetch<{
    value: { subject: string; from?: { emailAddress?: { name?: string } }; receivedDateTime: string }[]
    '@odata.count'?: number
  }>(
    accessToken,
    "/me/mailFolders/inbox/messages?$filter=isRead eq false&$top=15&$select=subject,from,receivedDateTime&$orderby=receivedDateTime desc&$count=true"
  )

  const files = await graphFetch<{ value: { name: string; webUrl: string; lastModifiedDateTime: string }[] }>(
    accessToken,
    '/me/drive/recent?$top=10'
  ).catch(() => ({ value: [] }))

  return {
    displayName: profile.displayName,
    unreadCount: mail.value.length,
    unreadItems: mail.value.map((m) => ({
      from: m.from?.emailAddress?.name ?? 'Unknown',
      subject: m.subject,
      receivedAt: m.receivedDateTime,
    })),
    recentFiles: files.value.map((f) => ({ name: f.name, webUrl: f.webUrl, modifiedAt: f.lastModifiedDateTime })),
  }
}
