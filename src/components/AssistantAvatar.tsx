import { useEffect, useState } from 'react'

// An original, hand-drawn flat-vector avatar (not a reproduction of any
// third-party generated image) — a friendly face that lightly animates its
// mouth and glows while the assistant's spoken reply (src/voice/speak.ts)
// is actually playing, via the devicehub:speaking-* events it dispatches.
export function AssistantAvatar({ size = 96 }: { size?: number }) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    const onStart = () => setSpeaking(true)
    const onEnd = () => setSpeaking(false)
    window.addEventListener('devicehub:speaking-start', onStart)
    window.addEventListener('devicehub:speaking-end', onEnd)
    return () => {
      window.removeEventListener('devicehub:speaking-start', onStart)
      window.removeEventListener('devicehub:speaking-end', onEnd)
    }
  }, [])

  return (
    <div
      className={`assistant-avatar${speaking ? ' speaking' : ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={speaking ? 'Assistant speaking' : 'Assistant'}
    >
      <svg viewBox="0 0 160 160" width="100%" height="100%">
        <circle className="assistant-avatar-glow" cx="80" cy="80" r="76" />
        <ellipse cx="80" cy="70" rx="47" ry="49" fill="var(--avatar-hair)" />
        <circle cx="80" cy="84" r="40" fill="var(--avatar-skin)" />
        <path d="M37 78c0-8 3-16 9-21-4 8-5 16-3 25-3-1-5-2-6-4Z" fill="var(--avatar-hair)" />
        <path d="M123 78c0-8-3-16-9-21 4 8 5 16 3 25 3-1 5-2 6-4Z" fill="var(--avatar-hair)" />

        <path d="M56 76c3-4 8-6 12-5" stroke="var(--avatar-brow)" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M104 76c-3-4-8-6-12-5" stroke="var(--avatar-brow)" strokeWidth="3" strokeLinecap="round" fill="none" />

        <ellipse cx="63" cy="88" rx="6" ry="7" fill="var(--avatar-eye)" />
        <ellipse cx="97" cy="88" rx="6" ry="7" fill="var(--avatar-eye)" />
        <circle cx="65" cy="85" r="1.6" fill="#fff" />
        <circle cx="99" cy="85" r="1.6" fill="#fff" />

        <ellipse className="assistant-avatar-mouth" cx="80" cy="108" rx="10" ry="3.5" fill="var(--avatar-mouth)" />

        <path
          d="M32 160c4-22 22-34 48-34s44 12 48 34Z"
          fill="var(--avatar-collar)"
        />
        <path d="M62 128c6 6 12 8 18 8s12-2 18-8l-6 14H68Z" fill="var(--avatar-shirt)" />
      </svg>
    </div>
  )
}
