import { useEffect, useState } from 'react'
import type { BudgetCategory, Transaction } from '../shared/types'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

export function Budget() {
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

  const [txCategoryId, setTxCategoryId] = useState('')
  const [txAmount, setTxAmount] = useState('')
  const [txDesc, setTxDesc] = useState('')

  async function refresh() {
    const [cats, txs, sum] = await Promise.all([
      window.api.budget.listCategories(),
      window.api.budget.listTransactions(month),
      window.api.budget.summary(month),
    ])
    setCategories(cats)
    setTransactions(txs)
    setSummary(sum)
    if (!txCategoryId && cats.length > 0) setTxCategoryId(cats[0].id)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addCategory() {
    if (!catName.trim()) return
    await window.api.budget.createCategory({ name: catName.trim(), monthlyLimit: catLimit, kind: catKind })
    setCatName('')
    setCatLimit(200)
    await refresh()
  }

  async function removeCategory(id: string) {
    await window.api.budget.removeCategory(id)
    await refresh()
  }

  async function addTransaction() {
    const amount = Number(txAmount)
    if (!txCategoryId || !amount) return
    await window.api.budget.createTransaction({
      categoryId: txCategoryId,
      amount,
      description: txDesc.trim() || null,
      occurredAt: new Date().toISOString(),
    })
    setTxAmount('')
    setTxDesc('')
    await refresh()
  }

  async function removeTransaction(id: string) {
    await window.api.budget.removeTransaction(id)
    await refresh()
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
                return (
                  <div key={c.categoryId} style={{ padding: '6px 0' }}>
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
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ marginTop: 6 }}
                      onClick={() => removeCategory(c.categoryId)}
                    >
                      Remove category
                    </button>
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
                    <div className="list-row-title">{t.description || categoryName(t.categoryId)}</div>
                    <div className="list-row-sub">
                      {categoryName(t.categoryId)} · {new Date(t.occurredAt).toLocaleDateString()}
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
