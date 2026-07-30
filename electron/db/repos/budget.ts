import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import type { BudgetCategory, NewBudgetCategory, NewTransaction, Transaction } from '../../../src/shared/types'

export function listCategories(): BudgetCategory[] {
  const db = getDb()
  return db.prepare('SELECT * FROM budget_categories ORDER BY kind ASC, name ASC').all() as BudgetCategory[]
}

export function createCategory(input: NewBudgetCategory): BudgetCategory {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO budget_categories (id, name, monthlyLimit, kind, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(id, input.name, input.monthlyLimit, input.kind, createdAt)
  return { id, createdAt, ...input }
}

export function removeCategory(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM budget_categories WHERE id = ?').run(id)
}

export function listTransactions(month?: string): Transaction[] {
  const db = getDb()
  if (month) {
    return db
      .prepare("SELECT * FROM transactions WHERE strftime('%Y-%m', occurredAt) = ? ORDER BY occurredAt DESC")
      .all(month) as Transaction[]
  }
  return db.prepare('SELECT * FROM transactions ORDER BY occurredAt DESC').all() as Transaction[]
}

export function createTransaction(input: NewTransaction): Transaction {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare(
    'INSERT INTO transactions (id, categoryId, amount, description, occurredAt, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, input.categoryId, input.amount, input.description ?? null, input.occurredAt, createdAt)
  return { id, createdAt, ...input }
}

export function removeTransaction(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
}

export function summary(month?: string) {
  const db = getDb()
  const targetMonth = month ?? new Date().toISOString().slice(0, 7)

  const categories = listCategories()
  const transactions = db
    .prepare("SELECT * FROM transactions WHERE strftime('%Y-%m', occurredAt) = ?")
    .all(targetMonth) as Transaction[]

  const byCategoryId = new Map<string, number>()
  for (const tx of transactions) {
    byCategoryId.set(tx.categoryId, (byCategoryId.get(tx.categoryId) ?? 0) + tx.amount)
  }

  let income = 0
  let expenses = 0
  const byCategory = categories.map((cat) => {
    const spent = byCategoryId.get(cat.id) ?? 0
    if (cat.kind === 'income') income += spent
    else expenses += spent
    return { categoryId: cat.id, name: cat.name, spent, limit: cat.monthlyLimit }
  })

  return { income, expenses, balance: income - expenses, byCategory }
}
