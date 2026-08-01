import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { shell } from 'electron'

/**
 * Generic OAuth "loopback" flow for installed/desktop apps: opens the
 * consent screen in the system browser and listens on a local port for the
 * redirect carrying the authorization code. Shared by every non-Google
 * integration (Spotify, Strava, Microsoft, LinkedIn) that uses a plain
 * OAuth 2.0 authorization-code flow.
 *
 * Most providers (Strava, Microsoft) validate only the domain/host of a
 * loopback redirect URI, so any free port works — pass `fixedPort`
 * unset (0) for those. Spotify validates the full URI including the port,
 * so it needs a specific port registered in the app dashboard — pass that
 * exact port as `fixedPort` for it. `host` picks which loopback hostname
 * shows up in the redirect URI ("127.0.0.1" vs "localhost") to match
 * whatever a given provider expects to see registered.
 */
export async function runLoopbackOAuth(
  buildAuthUrl: (redirectUri: string) => string,
  fixedPort = 0,
  host: '127.0.0.1' | 'localhost' = '127.0.0.1'
): Promise<{ code: string; redirectUri: string }> {
  const server = http.createServer()
  await new Promise<void>((resolve) => server.listen(fixedPort, host, resolve))
  const port = (server.address() as AddressInfo).port
  const redirectUri = `http://${host}:${port}/oauth2callback`

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
      res.end('<h2>Connected. You can close this window.</h2>')
      if (code) resolve(code)
    })
    server.on('error', reject)
  })

  await shell.openExternal(buildAuthUrl(redirectUri))

  const code = await codePromise
  server.close()
  return { code, redirectUri }
}
