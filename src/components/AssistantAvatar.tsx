import { useEffect, useState } from 'react'

// A simple gradient orb, not a face — idles with a slow breathing motion and
// picks up into a faster, larger pulse while the assistant's spoken reply
// (src/voice/speak.ts) is actually playing, via the devicehub:speaking-*
// events it dispatches.
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
      className={`assistant-orb${speaking ? ' speaking' : ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={speaking ? 'Assistant speaking' : 'Assistant'}
    />
  )
}
