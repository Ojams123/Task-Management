import { useEffect, useMemo, useRef, useState } from 'react'
import { NAV_ITEMS, type Page } from './Sidebar'
import { BellIcon, TargetIcon, WalletIcon, ClaudeIcon, type IconProps } from './icons'
import type { ComponentType } from 'react'

interface QuickAction {
  id: string
  label: string
  icon: ComponentType<IconProps>
  page: Page
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'add-reminder', label: 'Add reminder', icon: BellIcon, page: 'reminders' },
  { id: 'new-goal', label: 'New goal', icon: TargetIcon, page: 'goals' },
  { id: 'log-expense', label: 'Log expense', icon: WalletIcon, page: 'budget' },
  { id: 'ask-ai', label: 'Ask the assistant', icon: ClaudeIcon, page: 'assistant' },
]

type Entry =
  | { kind: 'action'; id: string; label: string; sublabel: string; icon: ComponentType<IconProps>; page: Page }
  | { kind: 'page'; id: string; label: string; sublabel: string; icon: ComponentType<IconProps>; page: Page }

export function CommandPalette({ onNavigate, onClose }: { onNavigate: (page: Page) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const entries = useMemo((): Entry[] => {
    const actions: Entry[] = QUICK_ACTIONS.map((a) => ({
      kind: 'action',
      id: a.id,
      label: a.label,
      sublabel: 'Quick action',
      icon: a.icon,
      page: a.page,
    }))
    const pages: Entry[] = NAV_ITEMS.map((n) => ({
      kind: 'page',
      id: n.id,
      label: n.label,
      sublabel: 'Go to page',
      icon: n.icon,
      page: n.id,
    }))
    const all = [...actions, ...pages]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((e) => e.label.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function activate(entry: Entry) {
    onNavigate(entry.page)
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, entries.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const entry = entries[activeIndex]
      if (entry) activate(entry)
    }
  }

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-row">
          <span className="command-palette-search-icon" aria-hidden="true">
            🔎
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to a page or run a quick action…"
          />
          <span className="command-palette-hint">esc</span>
        </div>
        <div className="command-palette-list">
          {entries.length === 0 ? (
            <div className="empty-state">No matches.</div>
          ) : (
            entries.map((entry, i) => {
              const Icon = entry.icon
              return (
                <button
                  key={`${entry.kind}-${entry.id}`}
                  className={`command-palette-row${i === activeIndex ? ' active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => activate(entry)}
                >
                  <span className="command-palette-row-icon">
                    <Icon size={16} />
                  </span>
                  <span className="command-palette-row-label">{entry.label}</span>
                  <span className="command-palette-row-sublabel">{entry.sublabel}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
