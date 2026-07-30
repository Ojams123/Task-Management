import { useEffect, useState, type ReactNode } from 'react'

interface AuthStatus {
  needsSetup: boolean
  authenticated: boolean
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [passcode, setPasscode] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const res = await fetch('/api/auth/status')
    setStatus(await res.json())
  }

  useEffect(() => {
    refresh()
    const onUnauthorized = () => refresh()
    window.addEventListener('devicehub:unauthorized', onUnauthorized)
    return () => window.removeEventListener('devicehub:unauthorized', onUnauthorized)
  }, [])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      if (status?.needsSetup) {
        if (passcode.length < 4) throw new Error('Passcode must be at least 4 characters.')
        if (passcode !== confirm) throw new Error('Passcodes do not match.')
        const res = await fetch('/api/auth/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Setup failed')
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Incorrect passcode')
      }
      setPasscode('')
      setConfirm('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (!status) {
    return <div className="empty-state">Loading…</div>
  }

  if (status.authenticated) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="card" style={{ width: 340 }}>
        <h3>{status.needsSetup ? 'Set up DeviceHub' : 'Enter your passcode'}</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          {status.needsSetup
            ? 'Choose a passcode to protect your data on this server. Anyone with it can reach everything in DeviceHub.'
            : "This device isn't signed in yet."}
        </p>
        <div className="field" style={{ marginBottom: 10 }}>
          <label>Passcode</label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !status.needsSetup && submit()}
            autoFocus
          />
        </div>
        {status.needsSetup && (
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Confirm passcode</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
        )}
        {error && (
          <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
            {error}
          </p>
        )}
        <button className="btn btn-primary" onClick={submit} disabled={busy} style={{ width: '100%' }}>
          {status.needsSetup ? 'Create passcode' : 'Unlock'}
        </button>
      </div>
    </div>
  )
}
