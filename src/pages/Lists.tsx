import { useEffect, useState } from 'react'
import type { JournalItem, JournalList } from '../shared/types'
import { Glyph } from '../components/Glyph'

export function Lists() {
  const [lists, setLists] = useState<JournalList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [items, setItems] = useState<JournalItem[]>([])
  const [loading, setLoading] = useState(true)

  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [newItemText, setNewItemText] = useState('')

  async function refreshLists() {
    const all = await window.api.journal.listLists()
    setLists(all)
    return all
  }

  async function refreshItems(listId: string) {
    setItems(await window.api.journal.listItems(listId))
  }

  useEffect(() => {
    async function init() {
      const all = await refreshLists()
      if (all.length > 0) {
        setSelectedListId(all[0].id)
        await refreshItems(all[0].id)
      }
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function selectList(id: string) {
    setSelectedListId(id)
    await refreshItems(id)
  }

  async function createList() {
    if (!newListName.trim()) return
    setCreatingList(true)
    try {
      const created = await window.api.journal.createList(newListName.trim())
      setNewListName('')
      await refreshLists()
      setSelectedListId(created.id)
      setItems([])
    } finally {
      setCreatingList(false)
    }
  }

  async function removeList(id: string) {
    if (!window.confirm('Delete this list and everything in it?')) return
    await window.api.journal.removeList(id)
    const all = await refreshLists()
    if (selectedListId === id) {
      if (all.length > 0) {
        setSelectedListId(all[0].id)
        await refreshItems(all[0].id)
      } else {
        setSelectedListId(null)
        setItems([])
      }
    }
  }

  async function addItem() {
    if (!selectedListId || !newItemText.trim()) return
    await window.api.journal.addItem(selectedListId, newItemText.trim())
    setNewItemText('')
    await refreshItems(selectedListId)
  }

  async function toggleItem(id: string) {
    if (!selectedListId) return
    await window.api.journal.toggleItem(id)
    await refreshItems(selectedListId)
  }

  async function removeItem(id: string) {
    if (!selectedListId) return
    await window.api.journal.removeItem(id)
    await refreshItems(selectedListId)
  }

  if (loading) return null

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null
  const uncheckedCount = items.filter((i) => !i.checked).length

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Your lists</h3>
        {lists.length === 0 ? (
          <div className="empty-state" style={{ marginBottom: 14 }}>
            Nothing yet — create a list for anything you want to keep track of: a shopping list, movies to watch,
            books to read.
          </div>
        ) : (
          <div className="dv2-action-row" style={{ marginBottom: 14 }}>
            {lists.map((l) => (
              <button
                key={l.id}
                className="dv2-action-pill"
                style={
                  l.id === selectedListId
                    ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent)' }
                    : undefined
                }
                onClick={() => selectList(l.id)}
              >
                {l.name}
              </button>
            ))}
          </div>
        )}
        <div className="inline-form">
          <input
            style={{ flex: 1 }}
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createList()}
            placeholder="New list name — e.g. Movies to watch"
          />
          <button className="btn btn-primary" onClick={createList} disabled={creatingList}>
            {creatingList ? 'Adding…' : 'Add list'}
          </button>
        </div>
      </div>

      {selectedList && (
        <div className="card">
          <h3>
            {selectedList.name}
            <button className="btn btn-sm btn-danger" onClick={() => removeList(selectedList.id)}>
              Delete list
            </button>
          </h3>
          <p className="muted" style={{ marginTop: -8, marginBottom: 14 }}>
            {items.length === 0 ? 'Nothing on this list yet.' : `${uncheckedCount} of ${items.length} left`}
          </p>
          <div className="inline-form" style={{ marginBottom: 14 }}>
            <input
              style={{ flex: 1 }}
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder="Add an item…"
            />
            <button className="btn btn-primary" onClick={addItem}>
              Add
            </button>
          </div>
          {items.length === 0 ? (
            <div className="empty-state">Add your first item above.</div>
          ) : (
            <div className="list">
              {items.map((item) => (
                <div className="fin-row" key={item.id} onClick={() => toggleItem(item.id)} style={{ cursor: 'pointer' }}>
                  <Glyph label={item.content} />
                  <div className="fin-row-main">
                    <div
                      className="fin-row-title"
                      style={item.checked ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}
                    >
                      {item.content}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-danger" onClick={() => removeItem(item.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
