import { useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import type { BudgetCategory, PlaidAccount, PlaidItem, PlaidTransaction, Transaction } from '../shared/types'
import { PlaidIcon } from '../components/icons'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

function ConnectBankButton({ onConnected }: { onConnected: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken, metadata) => {
      if (!publicToken) return
      await window.api.plaid.exchangePublicToken(publicToken, metadata.institution?.name ?? null)
      setLinkToken(null)
      onConnected()
    },
    onExit: () => setLinkToken(null),
  })

  useEffect(() => {
    if (linkToken && ready) open()
  }, [linkToken, ready, open])

  async function startConnect() {
    setFetching(true)
    setError(null)
    try {
      const { linkToken: token } = await window.api.plaid.createLinkToken()
      setLinkToken(token)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Plaid Link')
    } finally {
      setFetching(false)
    }
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={startConnect} disabled={fetching}>
        {fetching ? 'Connecting…' : '+ Connect a bank account'}
      </button>
      {error && (
        <p className="muted" style={{ color: 'var(--danger)', marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  )
}

export function Budget() {
  const [plaidConfigured, setPlaidConfigured] = useState<boolean | null>(null)
  const [plaidItems, setPlaidItems] = useState<PlaidItem[]>([])
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[]>([])
  const [plaidTransactions, setPlaidTransactions] = useState<PlaidTransaction[]>([])
  const [plaidSyncing, setPlaidSyncing] = useState(false)
  const [plaidError, setPlaidError] = useState<string | null>(null)

  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<{
    income: number
    expenses: number
    balance: number
    byCategory: { categoryId: string; name: string; spent: number; limit: number }[]
  } | null>(null)
  const [month] = useState(currentMonth())

  const [catName, setCatName] = useState('')
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense')
  const [catLimit, setCatLimit] = useState(200)

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editLimit, setEditLimit] = useState(0)

  const [txCategoryId, setTxCategoryId] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDesc, setTxDesc] = useState('')

  const [budgetError, setBudgetError] = useState<string | null>(null)

  async function refresh() {
    const [cats, txs, sum, plaidStatus] = await Promise.all([
      window.api.budget.listCategories(),
      window.api.budget.listTransactions(month),
      window.api.budget.summary(month),
      window.api.plaid.getSettings(),
    ])
    setCategories(cats)
    setTransactions(txs)
    setSummary(sum)
    if (!txCategoryId && cats.length > 0) setTxCategoryId(cats[0].id)
    setPlaidConfigured(plaidStatus.configured)
    if (plaidStatus.configured) {
      const [items, accounts, bankTxs] = await Promise.all([
        window.api.plaid.listItems(),
        window.api.plaid.listAccounts(),
        window.api.plaid.listTransactions(),
      ])
      setPlaidItems(items)
      setPlaidAccounts(accounts)
      setPlaidTransactions(bankTxs)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function syncPlaid() {
    setPlaidSyncing(true)
    setPlaidError(null)
    try {
      const { accounts, transactions: bankTxs } = await window.api.plaid.sync()
      setPlaidAccounts(accounts)
      setPlaidTransactions(bankTxs)
    } catch (e) {
      setPlaidError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setPlaidSyncing(false)
    }
  }

  async function disconnectItem(itemId: string) {
    await window.api.plaid.removeItem(itemId)
    await refresh()
  }

  function institutionName(itemId: string): string {
    return plaidItems.find((i) => i.id === itemId)?.institutionName ?? 'Bank'
  }

  async function addCategory() {
    if (!catName.trim()) return
    setBudgetError(null)
    try {
      await window.api.budget.createCategory({ name: catName.trim(), monthlyLimit: catLimit, kind: catKind })
      setCatName('')
      setCatLimit(200)
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not add category')
    }
  }

  async function removeCategory(id: string) {
    setBudgetError(null)
    try {
      await window.api.budget.removeCategory(id)
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not remove category')
    }
  }

  function startEditCategory(id: string, name: string, limit: number) {
    setEditingCategoryId(id)
    setEditName(name)
    setEditLimit(limit)
  }

  async function saveEditCategory(id: string) {
    if (!editName.trim()) return
    setBudgetError(null)
    try {
      await window.api.budget.updateCategory(id, { name: editName.trim(), monthlyLimit: editLimit })
      setEditingCategoryId(null)
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not save category')
    }
  }

  async function reassignTransaction(id: string, categoryId: string) {
    setBudgetError(null)
    try {
      await window.api.budget.updateTransactionCategory(id, categoryId)
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not reassign transaction')
    }
  }

  async function addTransaction() {
    const amount = Number(txAmount)
    if (!txCategoryId || !amount) return
    setBudgetError(null)
    try {
      await window.api.budget.createTransaction({
        categoryId: txCategoryId,
        amount,
        description: txDesc.trim() || null,
        occurredAt: new Date().toISOString(),
      })
      setTxAmount('')
      setTxDesc('')
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not add transaction')
    }
  }

  async function removeTransaction(id: string) {
    setBudgetError(null)
    try {
      await window.api.budget.removeTransaction(id)
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not remove transaction')
    }
  }

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Unknown'

  return (
    <div>
      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="stat">
            <span className="stat-label">Income this month</span>
            <span className="stat-value" style={{ color: 'var(--success)' }}>
              {formatMoney(summary?.income ?? 0)}
            </span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="stat-label">Expenses this month</span>
            <span className="stat-value" style={{ color: 'var(--danger)' }}>
              {formatMoney(summary?.expenses ?? 0)}
            </span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="stat-label">Balance</span>
            <span className="stat-value">{formatMoney(summary?.balance ?? 0)}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>
          <span className="heading-with-icon">
            <PlaidIcon size={20} />
            Bank accounts
          </span>
          {plaidConfigured && plaidItems.length > 0 && (
            <button className="btn btn-sm" onClick={syncPlaid} disabled={plaidSyncing}>
              {plaidSyncing ? 'Syncing…' : 'Sync'}
            </button>
          )}
        </h3>
        {plaidConfigured === false ? (
          <div className="empty-state">
            Add your Plaid client ID and secret in Settings to link a bank account (Rocket Money itself has no
            public API, but Plaid — the same aggregator it uses under the hood — does).
          </div>
        ) : (
          <>
            {plaidError && (
              <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
                {plaidError}
              </p>
            )}
            {plaidAccounts.length === 0 ? (
              <div className="empty-state" style={{ marginBottom: 14 }}>
                No bank accounts linked yet.
              </div>
            ) : (
              <div className="list" style={{ marginBottom: 14 }}>
                {plaidAccounts.map((a) => (
                  <div className="list-row" key={a.id}>
                    <div className="list-row-main">
                      <div className="list-row-title">
                        {a.name}
                        {a.mask && ` ····${a.mask}`}
                      </div>
                      <div className="list-row-sub">
                        {institutionName(a.itemId)} · {a.subtype ?? a.type ?? 'account'}
                      </div>
                    </div>
                    <div className="list-row-actions">
                      <span className="badge">
                        {a.currentBalance != null ? formatMoney(a.currentBalance) : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {plaidItems.length > 0 && (
              <div className="tag-row" style={{ marginBottom: 14 }}>
                {plaidItems.map((item) => (
                  <span key={item.id} className="badge">
                    {item.institutionName ?? 'Bank'}
                    <button
                      className="link"
                      style={{ marginLeft: 6 }}
                      onClick={() => disconnectItem(item.id)}
                    >
                      Disconnect
                    </button>
                  </span>
                ))}
              </div>
            )}
            <ConnectBankButton onConnected={refresh} />
          </>
        )}
      </div>

      {plaidConfigured && plaidTransactions.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Bank transactions</h3>
          <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
            Every sync automatically files new transactions into a matching budget category below — reassign any
            that get miscategorized from the "Recent transactions" list.
          </p>
          <div className="list">
            {plaidTransactions.slice(0, 15).map((t) => (
              <div className="list-row" key={t.id}>
                <div className="list-row-main">
                  <div className="list-row-title">{t.merchantName || t.name}</div>
                  <div className="list-row-sub">
                    {t.category ?? 'Uncategorized'} · {new Date(t.date).toLocaleDateString()}
                    {t.pending && ' · pending'}
                  </div>
                </div>
                <div className="list-row-actions">
                  <span className={`badge${t.amount > 0 ? ' danger' : ' success'}`}>
                    {formatMoney(Math.abs(t.amount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {budgetError && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p className="muted" style={{ color: 'var(--danger)', margin: 0 }}>
            {budgetError}
          </p>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Budget categories</h3>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>Name</label>
              <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Groceries" />
            </div>
            <div className="field">
              <label>Kind</label>
              <select value={catKind} onChange={(e) => setCatKind(e.target.value as 'expense' | 'income')}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="field">
              <label>Monthly limit</label>
              <input type="number" value={catLimit} onChange={(e) => setCatLimit(Number(e.target.value))} />
            </div>
            <button className="btn btn-primary" onClick={addCategory}>
              Add category
            </button>
          </div>

          {summary && summary.byCategory.length > 0 ? (
            <div className="list">
              {summary.byCategory.map((c) => {
                const pct = c.limit > 0 ? Math.min(100, (c.spent / c.limit) * 100) : 0
                const over = c.limit > 0 && c.spent > c.limit
                const isEditing = editingCategoryId === c.categoryId
                return (
                  <div key={c.categoryId} style={{ padding: '6px 0' }}>
                    {isEditing ? (
                      <div className="form-grid" style={{ marginBottom: 8 }}>
                        <div className="field">
                          <label>Name</label>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="field">
                          <label>Monthly limit</label>
                          <input
                            type="number"
                            value={editLimit}
                            onChange={(e) => setEditLimit(Number(e.target.value))}
                          />
                        </div>
                        <button className="btn btn-sm btn-primary" onClick={() => saveEditCategory(c.categoryId)}>
                          Save
                        </button>
                        <button className="btn btn-sm" onClick={() => setEditingCategoryId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}
                        >
                          <span>{c.name}</span>
                          <span className="muted">
                            {formatMoney(c.spent)} {c.limit > 0 ? `/ ${formatMoney(c.limit)}` : ''}
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div className={`progress-bar-fill${over ? ' over' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => startEditCategory(c.categoryId, c.name, c.limit)}
                          >
                            Edit
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => removeCategory(c.categoryId)}>
                            Remove category
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="empty-state">No categories yet.</div>
          )}
        </div>

        <div className="card">
          <h3>Add transaction</h3>
          <div className="form-grid" style={{ marginBottom: 14 }}>
            <div className="field">
              <label>Category</label>
              <select value={txCategoryId} onChange={(e) => setTxCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Amount</label>
              <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="45.00" />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="Optional note" />
            </div>
            <button className="btn btn-primary" onClick={addTransaction} disabled={categories.length === 0}>
              Add transaction
            </button>
          </div>

          <h3 style={{ marginTop: 20 }}>Recent transactions</h3>
          {transactions.length === 0 ? (
            <div className="empty-state">No transactions logged this month.</div>
          ) : (
            <div className="list">
              {transactions.map((t) => (
                <div className="list-row" key={t.id}>
                  <div className="list-row-main">
                    <div className="list-row-title">
                      {t.description || categoryName(t.categoryId)}
                      {t.plaidTransactionId && (
                        <span className="badge" style={{ marginLeft: 6, fontSize: 10 }} title="Auto-synced from your bank">
                          synced
                        </span>
                      )}
                    </div>
                    <div className="list-row-sub" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select
                        value={t.categoryId}
                        onChange={(e) => reassignTransaction(t.id, e.target.value)}
                        style={{ fontSize: 12, padding: '2px 4px' }}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <span>· {new Date(t.occurredAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="list-row-actions">
                    <span className="badge">{formatMoney(t.amount)}</span>
                    <button className="btn btn-sm btn-danger" onClick={() => removeTransaction(t.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
