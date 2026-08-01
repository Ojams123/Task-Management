import { buildAuthorizeUrl, exchangeCode, refreshAccessToken } from './oauth2'

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SCOPE = 'user-read-recently-played user-top-read'

export interface SpotifyCreds {
  clientId: string
  clientSecret: string
}

export function buildSpotifyAuthUrl(clientId: string, redirectUri: string): string {
  return buildAuthorizeUrl(AUTHORIZE_URL, {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPE,
  })
}

export async function exchangeSpotifyCode(creds: SpotifyCreds, redirectUri: string, code: string) {
  return exchangeCode({
    tokenUrl: TOKEN_URL,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    useBasicAuth: true,
    redirectUri,
    code,
  })
}

async function getAccessToken(creds: SpotifyCreds, refreshToken: string): Promise<string> {
  const token = await refreshAccessToken({
    tokenUrl: TOKEN_URL,
    clientId: creds.clientId,
    clientSecret: creds.clientSecret,
    useBasicAuth: true,
    refreshToken,
  })
  return token.accessToken
}

interface SpotifyImage {
  url: string
}

interface SpotifyTrack {
  name: string
  artists: { name: string }[]
  album: { images: SpotifyImage[] }
}

export interface SpotifyProfile {
  displayName: string
  imageUrl: string | null
}

export interface SpotifyRecentTrack {
  trackName: string
  artistName: string
  albumArt: string | null
  playedAt: string
}

async function spotifyFetch<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Spotify API error ${res.status}`)
  return res.json() as Promise<T>
}

export async function fetchSpotifySnapshot(
  creds: SpotifyCreds,
  refreshToken: string
): Promise<{ profile: SpotifyProfile; recentlyPlayed: SpotifyRecentTrack[] }> {
  const accessToken = await getAccessToken(creds, refreshToken)

  const profile = await spotifyFetch<{ display_name: string; images: SpotifyImage[] }>(accessToken, '/me')
  const recent = await spotifyFetch<{ items: { track: SpotifyTrack; played_at: string }[] }>(
    accessToken,
    '/me/player/recently-played?limit=10'
  )

  return {
    profile: { displayName: profile.display_name, imageUrl: profile.images?.[0]?.url ?? null },
    recentlyPlayed: recent.items.map((item) => ({
      trackName: item.track.name,
      artistName: item.track.artists.map((a) => a.name).join(', '),
      albumArt: item.track.album.images?.[0]?.url ?? null,
      playedAt: item.played_at,
    })),
  }
}
