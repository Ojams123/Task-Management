import { getDb } from '../index'
import { getCryptoAdapter } from '../../adapters'
import type { PlaidAccount, PlaidItem, PlaidTransaction } from '../../../src/shared/types'

interface ItemRow {
  id: string
  accessToken: string
  institutionName: string | null
  createdAt: string
}

export function saveItem(id: string, accessToken: string, institutionName: string | null) {
  const db = getDb()
  db.prepare('INSERT INTO plaid_items (id, accessToken, institutionName, createdAt) VALUES (?, ?, ?, ?)').run(
    id,
    getCryptoAdapter().encrypt(accessToken),
    institutionName,
    new Date().toISOString()
  )
}

export function listItemsWithTokens(): { id: string; accessToken: string; institutionName: string | null }[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM plaid_items').all() as ItemRow[]
  return rows.map((r) => ({ id: r.id, accessToken: getCryptoAdapter().decrypt(r.accessToken), institutionName: r.institutionName }))
}

export function listItems(): PlaidItem[] {
  const db = getDb()
  const rows = db.prepare('SELECT id, institutionName, createdAt FROM plaid_items ORDER BY createdAt DESC').all() as PlaidItem[]
  return rows
}

export function removeItem(id: string) {
  const db = getDb()
  db.prepare('DELETE FROM plaid_items WHERE id = ?').run(id)
}

export function replaceCachedAccounts(itemId: string, accounts: Omit<PlaidAccount, 'itemId'>[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()
  const tx = db.transaction((rows: Omit<PlaidAccount, 'itemId'>[]) => {
    db.prepare('DELETE FROM plaid_accounts WHERE itemId = ?').run(itemId)
    const insert = db.prepare(
      `INSERT INTO plaid_accounts (id, itemId, name, mask, type, subtype, currentBalance, availableBalance, isoCurrencyCode, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const a of rows) {
      insert.run(a.id, itemId, a.name, a.mask, a.type, a.subtype, a.currentBalance, a.availableBalance, a.isoCurrencyCode, syncedAt)
    }
  })
  tx(accounts)
}

export function listCachedAccounts(): PlaidAccount[] {
  const db = getDb()
  return db.prepare('SELECT id, itemId, name, mask, type, subtype, currentBalance, availableBalance, isoCurrencyCode FROM plaid_accounts ORDER BY name').all() as PlaidAccount[]
}

export function replaceCachedTransactions(itemId: string, transactions: Omit<PlaidTransaction, 'itemId'>[]) {
  const db = getDb()
  const syncedAt = new Date().toISOString()
  const tx = db.transaction((rows: Omit<PlaidTransaction, 'itemId'>[]) => {
    db.prepare('DELETE FROM plaid_transactions WHERE itemId = ?').run(itemId)
    const insert = db.prepare(
      `INSERT INTO plaid_transactions (id, accountId, itemId, amount, isoCurrencyCode, category, merchantName, name, pending, date, syncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const t of rows) {
      insert.run(t.id, t.accountId, itemId, t.amount, t.isoCurrencyCode, t.category, t.merchantName, t.name, t.pending ? 1 : 0, t.date, syncedAt)
    }
  })
  tx(transactions)
}

interface TransactionRow {
  id: string
  accountId: string
  itemId: string
  amount: number
  isoCurrencyCode: string | null
  category: string | null
  merchantName: string | null
  name: string
  pending: number
  date: string
}

export function listCachedTransactions(): PlaidTransaction[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM plaid_transactions ORDER BY date DESC LIMIT 200').all() as TransactionRow[]
  return rows.map((r) => ({ ...r, pending: !!r.pending }))
}
