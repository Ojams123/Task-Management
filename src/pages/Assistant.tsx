import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../shared/types'
import type { Page } from '../components/Sidebar'
import { isVoiceMuted, setVoiceMuted, speak } from '../voice/speak'
import { useSpeechRecognition } from '../voice/useSpeechRecognition'
import { AssistantAvatar } from '../components/AssistantAvatar'

export function Assistant({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [voiceMuted, setVoiceMutedState] = useState(() => isVoiceMuted())
  const scrollRef = useRef<HTMLDivElement>(null)
  const spokenIdsRef = useRef<Set<string>>(new Set())

  async function refresh() {
    const status = await window.api.assistant.getStatus()
    setConfigured(status.configured)
    if (status.configured) {
      const history = await window.api.assistant.getHistory()
      setMessages(history)
      spokenIdsRef.current = new Set(history.map((m) => m.id))
    }
    setHistoryLoaded(true)
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!historyLoaded) return
    const last = messages[messages.length - 1]
    if (last && last.role === 'assistant' && !spokenIdsRef.current.has(last.id)) {
      spokenIdsRef.current.add(last.id)
      speak(last.content)
    }
  }, [messages, historyLoaded])

  function toggleVoice() {
    const next = !voiceMuted
    setVoiceMutedState(next)
    setVoiceMuted(next)
  }

  const send = useCallback(
    async (overrideContent?: string) => {
      const content = (overrideContent ?? input).trim()
      if (!content || sending) return
      setInput('')
      setSending(true)
      setError(null)
      setMessages((prev) => [
        ...prev,
        { id: `pending-${Date.now()}`, role: 'user', content, createdAt: new Date().toISOString() },
      ])
      try {
        const updated = await window.api.assistant.sendMessage(content)
        setMessages(updated)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to reach the assistant')
        await refresh()
      } finally {
        setSending(false)
      }
    },
    [input, sending]
  )

  const handleTranscript = useCallback(
    (transcript: string) => {
      if (transcript.trim()) send(transcript)
    },
    [send]
  )

  const { supported: micSupported, listening, interim, start, stop } = useSpeechRecognition(handleTranscript)

  async function clear() {
    await window.api.assistant.clearHistory()
    setMessages([])
  }

  if (configured === false) {
    return (
      <div className="card">
        <h3>Set up the assistant</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Add your own Anthropic or OpenAI API key in Settings to enable the built-in assistant. It can answer
          questions about what's due and add reminders, goals, transactions, and fitness entries for you on
          request.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <AssistantAvatar size={88} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button className="btn btn-sm" onClick={toggleVoice}>
          {voiceMuted ? 'Voice replies: off' : 'Voice replies: on'}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="card"
        style={{ flex: 1, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {messages.length === 0 ? (
          <div className="empty-state">
            Ask it anything — "what's due this week?", "log a 5k run, 32 minutes, 350 calories", "add a goal to
            save $2000, target 2000 dollars".
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                color: m.role === 'user' ? 'var(--on-accent)' : 'var(--text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                borderRadius: 14,
                padding: '8px 12px',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.content}
            </div>
          ))
        )}
        {sending && <div className="muted">Thinking…</div>}
      </div>

      {error && (
        <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
          {error}
        </p>
      )}

      {listening && (
        <p className="muted" style={{ marginBottom: 8 }}>
          Listening… {interim}
        </p>
      )}

      <div className="inline-form">
        {micSupported && (
          <button
            type="button"
            className={`mic-button${listening ? ' listening' : ''}`}
            onClick={() => (listening ? stop() : start())}
            disabled={sending}
            title={listening ? 'Stop listening' : 'Speak to the assistant'}
          >
            {listening ? '● Listening' : '🎤'}
          </button>
        )}
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask the assistant, or tell it to add something…"
        />
        <button className="btn btn-primary" onClick={() => send()} disabled={sending}>
          Send
        </button>
        <button className="btn btn-sm" onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  )
}
