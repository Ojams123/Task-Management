import { getDb } from '../index'
import type { SimplefinAccount, SimplefinTransaction } from '../../../src/shared/types'

export function replaceCachedAccounts(accounts: Omit<SimplefinAccount, 'syncedAt'>[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()
  const tx = db.transaction((rows: Omit<SimplefinAccount, 'syncedAt'>[]) => {
    db.prepare('DELETE FROM simplefin_accounts').run()
    const insert = db.prepare(
      `INSERT INTO simplefin_accounts (id, name, orgName, currency, balance, availableBalance, balanceDate, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const a of rows) {
      insert.run(a.id, a.name, a.orgName, a.currency, a.balance, a.availableBalance, a.balanceDate, syncedAt)
    }
  })
  tx(accounts)
}

export function listCachedAccounts(): SimplefinAccount[] {
  const db = getDb()
  return db
    .prepare('SELECT id, name, orgName, currency, balance, availableBalance, balanceDate FROM simplefin_accounts ORDER BY name')
    .all() as SimplefinAccount[]
}

export function replaceCachedTransactions(transactions: Omit<SimplefinTransaction, 'syncedAt'>[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()
  const tx = db.transaction((rows: Omit<SimplefinTransaction, 'syncedAt'>[]) => {
    db.prepare('DELETE FROM simplefin_transactions').run()
    const insert = db.prepare(
      `INSERT INTO simplefin_transactions (id, accountId, amount, description, memo, pending, date, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const t of rows) {
      insert.run(t.id, t.accountId, t.amount, t.description, t.memo ?? null, t.pending ? 1 : 0, t.date, syncedAt)
    }
  })
  tx(transactions)
}

interface TransactionRow {
  id: string
  accountId: string
  amount: number
  description: string
  memo: string | null
  pending: number
  date: string
}

export function listCachedTransactions(): SimplefinTransaction[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM simplefin_transactions ORDER BY date DESC LIMIT 200').all() as TransactionRow[]
  return rows.map((r) => ({ ...r, pending: !!r.pending }))
}

export function clearAll() {
  const db = getDb()
  db.prepare('DELETE FROM simplefin_accounts').run()
}
