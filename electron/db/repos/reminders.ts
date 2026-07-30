import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import type { NewReminder, Reminder } from '../../../src/shared/types'

interface ReminderRow {
  id: string
  title: string
  notes: string | null
  dueAt: string
  recurrence: Reminder['recurrence']
  completed: number
  createdAt: string
}

function toReminder(row: ReminderRow): Reminder {
  return { ...row, completed: !!row.completed }
}

export function listReminders(): Reminder[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM reminders ORDER BY dueAt ASC').all() as ReminderRow[]
  return rows.map(toReminder)
}

export function createReminder(input: NewReminder): Reminder {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO reminders (id, title, notes, dueAt, recurrence, completed, createdAt) VALUES (?, ?, ?, ?, ?, 0, ?)'
  ).run(id, input.title, input.notes ?? null, input.dueAt, input.recurrence, createdAt)
  return { id, completed: false, createdAt, ...input }
}

export function updateReminder(
  id: string,
  updates: Partial<NewReminder & { completed: boolean }>
): Reminder {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as
    | ReminderRow
    | undefined
  if (!existing) throw new Error(`Reminder ${id} not found`)

  const merged = {
    title: updates.title ?? existing.title,
    notes: updates.notes !== undefined ? updates.notes : existing.notes,
    dueAt: updates.dueAt ?? existing.dueAt,
    recurrence: updates.recurrence ?? existing.recurrence,
    completed: updates.completed !== undefined ? updates.completed : !!existing.completed,
  }

  db.prepare(
    'UPDATE reminders SET title = ?, notes = ?, dueAt = ?, recurrence = ?, completed = ? WHERE id = ?'
  ).run(merged.title, merged.notes, merged.dueAt, merged.recurrence, merged.completed ? 1 : 0, id)

  return { id, createdAt: existing.createdAt, ...merged }
}

export function removeReminder(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM reminders WHERE id = ?').run(id)
}

export function markFired(id: string, firedAt: string) {
  const db = getDb()
  db.prepare('UPDATE reminders SET lastFiredAt = ? WHERE id = ?').run(firedAt, id)
}

export function getDueUnfired(nowIso: string): (Reminder & { lastFiredAt: string | null })[] {
  const db = getDb()
  const rows = db
    .prepare(
      `SELECT * FROM reminders
       WHERE completed = 0
         AND dueAt <= ?
         AND (lastFiredAt IS NULL OR lastFiredAt < dueAt)`
    )
    .all(nowIso) as (ReminderRow & { lastFiredAt: string | null })[]
  return rows.map((r) => ({ ...toReminder(r), lastFiredAt: r.lastFiredAt }))
}
