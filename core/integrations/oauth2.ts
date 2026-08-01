// Small shared helpers for the plain OAuth 2.0 authorization-code flow used
// by Spotify, Strava, Microsoft, and LinkedIn — unlike Google, none of these
// need a dedicated SDK, just token-endpoint POSTs.

export interface TokenResponse {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
}

export function buildAuthorizeUrl(authorizeUrl: string, params: Record<string, string>): string {
  return `${authorizeUrl}?${new URLSearchParams(params).toString()}`
}

interface TokenRequestBase {
  tokenUrl: string
  clientId: string
  clientSecret: string
  useBasicAuth?: boolean
}

async function postToken(base: TokenRequestBase, body: URLSearchParams): Promise<TokenResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (base.useBasicAuth) {
    headers.Authorization = `Basic ${Buffer.from(`${base.clientId}:${base.clientSecret}`).toString('base64')}`
  } else {
    body.set('client_id', base.clientId)
    body.set('client_secret', base.clientSecret)
  }
  const res = await fetch(base.tokenUrl, { method: 'POST', headers, body })
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `Token request failed (${res.status})`)
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in }
}

export function exchangeCode(
  base: TokenRequestBase & { redirectUri: string; code: string }
): Promise<TokenResponse> {
  return postToken(
    base,
    new URLSearchParams({ grant_type: 'authorization_code', code: base.code, redirect_uri: base.redirectUri })
  )
}

export function refreshAccessToken(base: TokenRequestBase & { refreshToken: string }): Promise<TokenResponse> {
  return postToken(base, new URLSearchParams({ grant_type: 'refresh_token', refresh_token: base.refreshToken }))
}
