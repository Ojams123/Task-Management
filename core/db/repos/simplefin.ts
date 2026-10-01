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

const MIN_LOOKBACK_DAYS = 30
// SimpleFIN Bridge only serves ~90 days of history per request.
const MAX_LOOKBACK_DAYS = 90
const LOOKBACK_OVERLAP_DAYS = 7

// How far back the next sync should ask for transactions. Normally 30 days,
// but if any account's data stopped updating (bank login expired at the
// bridge, or the app was down) reach back past that point so the gap gets
// filled in once the connection is fixed, instead of being skipped forever.
export function syncLookbackDays(now = Date.now()): number {
  const db = getDb()
  const row = db
    .prepare('SELECT MIN(balanceDate) AS oldest FROM simplefin_accounts WHERE balanceDate IS NOT NULL')
    .get() as { oldest: string | null } | undefined
  if (!row?.oldest) return MIN_LOOKBACK_DAYS
  const staleDays = Math.ceil((now - new Date(row.oldest).getTime()) / (24 * 60 * 60 * 1000))
  return Math.min(MAX_LOOKBACK_DAYS, Math.max(MIN_LOOKBACK_DAYS, staleDays + LOOKBACK_OVERLAP_DAYS))
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

// Every cached transaction, not just the newest 200 shown in the UI, so a
// long catch-up sync gets fully filed into the budget.
export function listAllCachedTransactions(): SimplefinTransaction[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM simplefin_transactions ORDER BY date DESC').all() as TransactionRow[]
  return rows.map((r) => ({ ...r, pending: !!r.pending }))
}

export function clearAll() {
  const db = getDb()
  db.prepare('DELETE FROM simplefin_accounts').run()
}
