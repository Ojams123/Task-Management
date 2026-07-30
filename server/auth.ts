import type { Request, Response, NextFunction } from 'express'
import { createSession, deleteSession, hasPasscode, isValidSession, setPasscode, verifyPasscode } from '../core/db/repos/auth'

export const SESSION_COOKIE = 'devicehub_session'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (token && isValidSession(token)) {
    next()
    return
  }
  res.status(401).json({ error: 'Not authenticated' })
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  })
}

export function registerAuthRoutes(app: import('express').Express) {
  app.get('/api/auth/status', (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE]
    res.json({
      needsSetup: !hasPasscode(),
      authenticated: !!token && isValidSession(token),
    })
  })

  app.post('/api/auth/setup', (req, res) => {
    if (hasPasscode()) {
      res.status(409).json({ error: 'A passcode is already set. Use /login instead.' })
      return
    }
    const { passcode } = req.body ?? {}
    if (typeof passcode !== 'string' || passcode.length < 4) {
      res.status(400).json({ error: 'Passcode must be at least 4 characters.' })
      return
    }
    setPasscode(passcode)
    const { token } = createSession()
    setSessionCookie(res, token)
    res.json({ ok: true })
  })

  app.post('/api/auth/login', (req, res) => {
    const { passcode } = req.body ?? {}
    if (typeof passcode !== 'string' || !verifyPasscode(passcode)) {
      res.status(401).json({ error: 'Incorrect passcode' })
      return
    }
    const { token } = createSession()
    setSessionCookie(res, token)
    res.json({ ok: true })
  })

  app.post('/api/auth/logout', (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE]
    if (token) deleteSession(token)
    res.clearCookie(SESSION_COOKIE)
    res.json({ ok: true })
  })
}
