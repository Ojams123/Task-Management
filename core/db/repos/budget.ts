import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import type {
  BudgetCategory,
  BudgetCategoryUpdate,
  NewBudgetCategory,
  NewTransaction,
  Transaction,
} from '../../../src/shared/types'

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

export function updateCategory(id: string, updates: BudgetCategoryUpdate): BudgetCategory {
  const db = getDb()
  const current = db.prepare('SELECT * FROM budget_categories WHERE id = ?').get(id) as BudgetCategory
  const next = { ...current, ...updates }
  db.prepare('UPDATE budget_categories SET name = ?, monthlyLimit = ? WHERE id = ?').run(
    next.name,
    next.monthlyLimit,
    id
  )
  return next
}

export function removeCategory(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM budget_categories WHERE id = ?').run(id)
}

export function findOrCreateCategory(name: string, kind: 'expense' | 'income'): BudgetCategory {
  const db = getDb()
  const existing = db
    .prepare('SELECT * FROM budget_categories WHERE name = ? COLLATE NOCASE')
    .get(name) as BudgetCategory | undefined
  if (existing) return existing
  return createCategory({ name, monthlyLimit: 0, kind })
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
    'INSERT INTO transactions (id, categoryId, amount, description, occurredAt, createdAt, plaidTransactionId, simplefinTransactionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    input.categoryId,
    input.amount,
    input.description ?? null,
    input.occurredAt,
    createdAt,
    input.plaidTransactionId ?? null,
    input.simplefinTransactionId ?? null
  )
  return { id, createdAt, plaidTransactionId: null, simplefinTransactionId: null, ...input }
}

export function removeTransaction(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
}

export function updateTransactionCategory(id: string, categoryId: string): Transaction {
  const db = getDb()
  db.prepare('UPDATE transactions SET categoryId = ? WHERE id = ?').run(categoryId, id)
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction
}

export function linkedPlaidTransactionIds(): Set<string> {
  const db = getDb()
  const rows = db
    .prepare("SELECT plaidTransactionId FROM transactions WHERE plaidTransactionId IS NOT NULL")
    .all() as { plaidTransactionId: string }[]
  return new Set(rows.map((r) => r.plaidTransactionId))
}

export function linkedSimplefinTransactionIds(): Set<string> {
  const db = getDb()
  const rows = db
    .prepare("SELECT simplefinTransactionId FROM transactions WHERE simplefinTransactionId IS NOT NULL")
    .all() as { simplefinTransactionId: string }[]
  return new Set(rows.map((r) => r.simplefinTransactionId))
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
