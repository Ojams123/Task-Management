import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import type { Goal, GoalLogEntry, NewGoal } from '../../../src/shared/types'

interface GoalRow {
  id: string
  title: string
  description: string | null
  category: string
  targetValue: number
  currentValue: number
  unit: string
  dueDate: string | null
  createdAt: string
  archived: number
}

function toGoal(row: GoalRow): Goal {
  return { ...row, archived: !!row.archived }
}

export function listGoals(): Goal[] {
  const db = getDb()
  const rows = db
    .prepare('SELECT * FROM goals ORDER BY archived ASC, createdAt DESC')
    .all() as GoalRow[]
  return rows.map(toGoal)
}

export function createGoal(input: NewGoal): Goal {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const currentValue = input.currentValue ?? 0
  db.prepare(
    `INSERT INTO goals (id, title, description, category, targetValue, currentValue, unit, dueDate, createdAt, archived)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    input.title,
    input.description ?? null,
    input.category,
    input.targetValue,
    currentValue,
    input.unit,
    input.dueDate ?? null,
    createdAt
  )
  return { id, createdAt, archived: false, ...input, currentValue }
}

export function updateGoal(id: string, updates: Partial<NewGoal & { archived: boolean }>): Goal {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow | undefined
  if (!existing) throw new Error(`Goal ${id} not found`)

  const merged = {
    title: updates.title ?? existing.title,
    description: updates.description !== undefined ? updates.description : existing.description,
    category: updates.category ?? existing.category,
    targetValue: updates.targetValue ?? existing.targetValue,
    currentValue: updates.currentValue ?? existing.currentValue,
    unit: updates.unit ?? existing.unit,
    dueDate: updates.dueDate !== undefined ? updates.dueDate : existing.dueDate,
    archived: updates.archived !== undefined ? updates.archived : !!existing.archived,
  }

  db.prepare(
    `UPDATE goals SET title = ?, description = ?, category = ?, targetValue = ?, currentValue = ?, unit = ?, dueDate = ?, archived = ?
     WHERE id = ?`
  ).run(
    merged.title,
    merged.description,
    merged.category,
    merged.targetValue,
    merged.currentValue,
    merged.unit,
    merged.dueDate,
    merged.archived ? 1 : 0,
    id
  )

  return { id, createdAt: existing.createdAt, ...merged }
}

export function logGoalProgress(id: string, delta: number, note?: string): Goal {
  const db = getDb()
  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as GoalRow | undefined
  if (!existing) throw new Error(`Goal ${id} not found`)

  const newValue = existing.currentValue + delta
  db.prepare('UPDATE goals SET currentValue = ? WHERE id = ?').run(newValue, id)
  db.prepare(
    'INSERT INTO goal_log (id, goalId, delta, note, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(randomUUID(), id, delta, note ?? null, new Date().toISOString())

  return toGoal({ ...existing, currentValue: newValue })
}

export function goalHistory(id: string): GoalLogEntry[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM goal_log WHERE goalId = ? ORDER BY createdAt DESC')
    .all(id) as GoalLogEntry[]
}

export function findGoalByTitle(title: string): Goal | undefined {
  const db = getDb()
  const row = db
    .prepare('SELECT * FROM goals WHERE archived = 0 AND title LIKE ? COLLATE NOCASE ORDER BY createdAt DESC LIMIT 1')
    .get(`%${title}%`) as GoalRow | undefined
  return row ? toGoal(row) : undefined
}

export function removeGoal(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM goals WHERE id = ?').run(id)
}
