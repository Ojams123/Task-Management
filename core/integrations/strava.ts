import { buildAuthorizeUrl, exchangeCode, refreshAccessToken } from './oauth2'

const AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize'
const TOKEN_URL = 'https://www.strava.com/oauth/token'
const SCOPE = 'read,activity:read_all'

export interface StravaCreds {
  clientId: string
  clientSecret: string
}

export function buildStravaAuthUrl(clientId: string, redirectUri: string): string {
  return buildAuthorizeUrl(AUTHORIZE_URL, {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    approval_prompt: 'auto',
    scope: SCOPE,
  })
}

export async function exchangeStravaCode(creds: StravaCreds, redirectUri: string, code: string) {
  return exchangeCode({
    tokenUrl: TOKEN_URL,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    redirectUri,
    code,
  })
}

interface StravaActivity {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  start_date: string
}

export interface StravaActivitySummary {
  id: number
  name: string
  type: string
  distanceMiles: number
  movingMinutes: number
  startDate: string
}

// Strava rotates the refresh token on every use — the caller must persist
// the returned refreshToken (which may differ from the one passed in)
// alongside whatever it caches from this call.
export async function fetchStravaSnapshot(
  creds: StravaCreds,
  refreshToken: string
): Promise<{ athleteName: string; activities: StravaActivitySummary[]; refreshToken: string }> {
  const token = await refreshAccessToken({
    tokenUrl: TOKEN_URL,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    refreshToken,
  })
  const newRefreshToken = token.refreshToken ?? refreshToken

  const [athlete, activities] = await Promise.all([
    fetch('https://www.strava.com/api/v3/athlete', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    }).then((r) => r.json() as Promise<{ firstname: string; lastname: string }>),
    fetch('https://www.strava.com/api/v3/athlete/activities?per_page=10', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    }).then((r) => r.json() as Promise<StravaActivity[]>),
  ])

  return {
    athleteName: `${athlete.firstname} ${athlete.lastname}`.trim(),
    activities: activities.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      distanceMiles: Math.round((a.distance / 1609.34) * 10) / 10,
      movingMinutes: Math.round(a.moving_time / 60),
      startDate: a.start_date,
    })),
    refreshToken: newRefreshToken,
  }
}
