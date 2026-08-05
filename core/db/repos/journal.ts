import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import type { JournalItem, JournalList } from '../../../src/shared/types'

interface JournalItemRow {
  id: string
  listId: string
  content: string
  notes: string | null
  checked: number
  createdAt: string
}

function toItem(row: JournalItemRow): JournalItem {
  return { ...row, checked: !!row.checked }
}

export function listLists(): JournalList[] {
  const db = getDb()
  return db.prepare('SELECT * FROM journal_lists ORDER BY sortOrder ASC, createdAt ASC').all() as JournalList[]
}

export function createList(name: string, icon: string | null): JournalList {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const { maxOrder } = db.prepare('SELECT COALESCE(MAX(sortOrder), -1) AS maxOrder FROM journal_lists').get() as {
    maxOrder: number
  }
  const sortOrder = maxOrder + 1
  db.prepare('INSERT INTO journal_lists (id, name, icon, sortOrder, createdAt) VALUES (?, ?, ?, ?, ?)').run(
    id,
    name,
    icon,
    sortOrder,
    createdAt
  )
  return { id, name, icon, sortOrder, createdAt }
}

export function removeList(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM journal_lists WHERE id = ?').run(id)
}

export function listItems(listId: string): JournalItem[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM journal_items WHERE listId = ? ORDER BY checked ASC, createdAt DESC')
    .all(listId) as JournalItemRow[]
  return rows.map(toItem)
}

export function addItem(listId: string, content: string): JournalItem {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare('INSERT INTO journal_items (id, listId, content, notes, checked, createdAt) VALUES (?, ?, ?, NULL, 0, ?)').run(
    id,
    listId,
    content,
    createdAt
  )
  return { id, listId, content, notes: null, checked: false, createdAt }
}

export function toggleItem(id: string): JournalItem {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM journal_items WHERE id = ?').get(id) as JournalItemRow | undefined
  if (!existing) throw new Error(`Journal item ${id} not found`)
  const checked = existing.checked ? 0 : 1
  db.prepare('UPDATE journal_items SET checked = ? WHERE id = ?').run(checked, id)
  return toItem({ ...existing, checked })
}

export function removeItem(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM journal_items WHERE id = ?').run(id)
}
