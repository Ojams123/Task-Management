import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../shared/types'
import type { Page } from '../components/Sidebar'

export function Assistant({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function refresh() {
    const status = await window.api.assistant.getStatus()
    setConfigured(status.configured)
    if (status.configured) setMessages(await window.api.assistant.getHistory())
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send() {
    const content = input.trim()
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
  }

  async function clear() {
    await window.api.assistant.clearHistory()
    setMessages([])
  }

  if (configured === false) {
    return (
      <div className="card">
        <h3>Set up the assistant</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Add your own Anthropic API key in Settings to enable the built-in assistant. It can answer questions
          about what's due and add reminders, goals, transactions, and fitness entries for you on request.
        </p>
        <button className="btn btn-primary" onClick={() => onNavigate?.('settings')}>
          Go to Settings
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                color: m.role === 'user' ? '#0b1220' : 'var(--text)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                borderRadius: 10,
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

      <div className="inline-form">
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask the assistant, or tell it to add something…"
        />
        <button className="btn btn-primary" onClick={send} disabled={sending}>
          Send
        </button>
        <button className="btn btn-sm" onClick={clear}>
          Clear
        </button>
      </div>
    </div>
  )
}
