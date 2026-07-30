import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import type { ExerciseEntry, FoodEntry, NewExerciseEntry, NewFoodEntry } from '../../../src/shared/types'

function dayRange(date: string): { start: string; end: string } {
  const start = `${date}T00:00:00.000Z`
  const end = `${date}T23:59:59.999Z`
  return { start, end }
}

export function listFood(date?: string): FoodEntry[] {
  const db = getDb()
  if (date) {
    const { start, end } = dayRange(date)
    return db
      .prepare('SELECT * FROM food_entries WHERE consumedAt BETWEEN ? AND ? ORDER BY consumedAt DESC')
      .all(start, end) as FoodEntry[]
  }
  return db.prepare('SELECT * FROM food_entries ORDER BY consumedAt DESC').all() as FoodEntry[]
}

export function createFood(input: NewFoodEntry): FoodEntry {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO food_entries (id, name, calories, protein, carbs, fat, consumedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.calories,
    input.protein ?? null,
    input.carbs ?? null,
    input.fat ?? null,
    input.consumedAt,
    createdAt
  )
  return { id, createdAt, ...input }
}

export function removeFood(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM food_entries WHERE id = ?').run(id)
}

export function listExercise(date?: string): ExerciseEntry[] {
  const db = getDb()
  if (date) {
    const { start, end } = dayRange(date)
    return db
      .prepare('SELECT * FROM exercise_entries WHERE occurredAt BETWEEN ? AND ? ORDER BY occurredAt DESC')
      .all(start, end) as ExerciseEntry[]
  }
  return db.prepare('SELECT * FROM exercise_entries ORDER BY occurredAt DESC').all() as ExerciseEntry[]
}

export function createExercise(input: NewExerciseEntry): ExerciseEntry {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    `INSERT INTO exercise_entries (id, activity, durationMinutes, caloriesBurned, notes, occurredAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.activity,
    input.durationMinutes ?? null,
    input.caloriesBurned ?? null,
    input.notes ?? null,
    input.occurredAt,
    createdAt
  )
  return { id, createdAt, ...input }
}

export function removeExercise(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM exercise_entries WHERE id = ?').run(id)
}

export function dailyTotals(date: string): { consumed: number; burned: number } {
  const food = listFood(date)
  const exercise = listExercise(date)
  const consumed = food.reduce((sum, f) => sum + f.calories, 0)
  const burned = exercise.reduce((sum, e) => sum + (e.caloriesBurned ?? 0), 0)
  return { consumed, burned }
}
