import { useCallback, useState } from 'react'
import { useSpeechRecognition } from '../voice/useSpeechRecognition'
import { parseVoiceCommand } from '../voice/commandParser'
import type { Page } from './Sidebar'

function speak(text: string) {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  window.speechSynthesis.speak(utterance)
}

export function VoiceBar({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [feedback, setFeedback] = useState('')

  const handleTranscript = useCallback(
    async (transcript: string) => {
      const intent = parseVoiceCommand(transcript)

      if (intent.type === 'add-reminder') {
        try {
          await window.api.reminders.create({
            title: intent.title,
            notes: null,
            dueAt: intent.dueAt,
            recurrence: 'none',
          })
          const when = new Date(intent.dueAt).toLocaleString(undefined, {
            weekday: 'short',
            hour: 'numeric',
            minute: '2-digit',
          })
          const message = `Reminder set: "${intent.title}" for ${when}`
          setFeedback(message)
          speak(message)
        } catch {
          setFeedback('Sorry, I could not save that reminder.')
        }
        return
      }

      if (intent.type === 'navigate') {
        onNavigate(intent.page)
        setFeedback(`Heard: "${transcript}" — opening ${intent.page}`)
        return
      }

      setFeedback(`Heard: "${transcript}" — I didn't recognize that command.`)
    },
    [onNavigate]
  )

  const { supported, listening, interim, start, stop } = useSpeechRecognition(handleTranscript)

  if (!supported) {
    return <span className="muted">Voice commands unavailable in this build</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        className={`mic-button${listening ? ' listening' : ''}`}
        onClick={() => (listening ? stop() : start())}
      >
        {listening ? 'Listening…' : 'Voice command'}
      </button>
      <span className="voice-feedback">{listening ? interim || 'Say a command…' : feedback}</span>
    </div>
  )
}
