import { buildAuthorizeUrl, exchangeCode, refreshAccessToken } from './oauth2'

const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SCOPE =
  'user-read-recently-played user-top-read user-read-playback-state user-modify-playback-state user-read-currently-playing'

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

export async function getAccessToken(creds: SpotifyCreds, refreshToken: string): Promise<string> {
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

export interface SpotifyPlaybackState {
  isPlaying: boolean
  trackName: string | null
  artistName: string | null
  albumArt: string | null
  progressMs: number | null
  durationMs: number | null
  deviceName: string | null
}

interface SpotifyPlaybackResponse {
  is_playing: boolean
  progress_ms: number | null
  device?: { name: string }
  item?: SpotifyTrack & { duration_ms: number }
}

export async function fetchPlaybackState(creds: SpotifyCreds, refreshToken: string): Promise<SpotifyPlaybackState | null> {
  const accessToken = await getAccessToken(creds, refreshToken)
  const res = await fetch('https://api.spotify.com/v1/me/player', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`Spotify API error ${res.status}`)
  const json = (await res.json()) as SpotifyPlaybackResponse
  if (!json.item) return null
  return {
    isPlaying: json.is_playing,
    trackName: json.item.name,
    artistName: json.item.artists.map((a) => a.name).join(', '),
    albumArt: json.item.album.images?.[0]?.url ?? null,
    progressMs: json.progress_ms,
    durationMs: json.item.duration_ms,
    deviceName: json.device?.name ?? null,
  }
}

export type SpotifyPlaybackAction = 'play' | 'pause' | 'next' | 'previous'

// Remote-controls whatever device already has an active Spotify session
// (phone, desktop app, speaker) — Spotify's playback API doesn't stream
// audio anywhere itself, it just relays commands to an active player.
export async function controlSpotifyPlayback(
  creds: SpotifyCreds,
  refreshToken: string,
  action: SpotifyPlaybackAction
): Promise<void> {
  const accessToken = await getAccessToken(creds, refreshToken)
  const method = action === 'play' || action === 'pause' ? 'PUT' : 'POST'
  const res = await fetch(`https://api.spotify.com/v1/me/player/${action}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.ok || res.status === 204) return

  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; reason?: string } }
  if (body.error?.reason === 'PREMIUM_REQUIRED') {
    throw new Error('Spotify Premium is required to control playback.')
  }
  if (res.status === 404) {
    throw new Error('No active Spotify device found — open Spotify and start playing something on your phone or computer first.')
  }
  throw new Error(body.error?.message || `Spotify playback control failed (${res.status})`)
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
