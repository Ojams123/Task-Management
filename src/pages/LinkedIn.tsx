import { useEffect, useState } from 'react'
import type { LinkedInProfile } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { LinkedInIcon } from '../components/icons'

export function LinkedIn({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [profile, setProfile] = useState<LinkedInProfile | null | undefined>(undefined)

  useEffect(() => {
    window.api.linkedin.getProfile().then(setProfile)
  }, [])

  if (profile === undefined) return null

  if (!profile) {
    return (
      <div className="card">
        <h3>
          <span className="heading-with-icon">
            <LinkedInIcon size={20} />
            Connect LinkedIn
          </span>
        </h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Connect your LinkedIn account in Settings to show your basic profile here. LinkedIn's API only allows
          this much for personal apps — no feed, connections, or activity.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>
        <span className="heading-with-icon">
          <LinkedInIcon size={20} />
          Profile
        </span>
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {profile.pictureUrl && (
          <img src={profile.pictureUrl} alt="" width={64} height={64} style={{ borderRadius: '50%' }} />
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{profile.name}</div>
          {profile.email && <div className="muted">{profile.email}</div>}
        </div>
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        That's everything LinkedIn's API exposes to personal apps — connected{' '}
        {new Date(profile.connectedAt).toLocaleDateString()}. Reconnect from Settings any time.
      </p>
    </div>
  )
}
