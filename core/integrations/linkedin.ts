import { buildAuthorizeUrl, exchangeCode } from './oauth2'

const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
// LinkedIn's public API for ordinary developer apps only supports this
// OpenID Connect sign-in scope — no feed, connections, or activity data is
// available without a restrictive partnership tier.
const SCOPE = 'openid profile email'

export interface LinkedInCreds {
  clientId: string
  clientSecret: string
}

export function buildLinkedInAuthUrl(clientId: string, redirectUri: string): string {
  return buildAuthorizeUrl(AUTHORIZE_URL, {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPE,
  })
}

export function exchangeLinkedInCode(creds: LinkedInCreds, redirectUri: string, code: string) {
  return exchangeCode({
    tokenUrl: TOKEN_URL,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri,
    code,
  })
}

export interface LinkedInProfile {
  name: string
  email: string | null
  pictureUrl: string | null
}

export async function fetchLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`LinkedIn API error ${res.status}`)
  const json = (await res.json()) as { name: string; email?: string; picture?: string }
  return { name: json.name, email: json.email ?? null, pictureUrl: json.picture ?? null }
}
