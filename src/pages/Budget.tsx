import { useEffect, useState } from 'react'
import type { BudgetCategory, SimplefinAccount, SimplefinTransaction, Transaction } from '../shared/types'
import { Sparkline } from '../components/Sparkline'
import { Glyph } from '../components/Glyph'
import { Drawer } from '../components/Drawer'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

const COLLEGE_BUDGET_SEED: { name: string; kind: 'income' | 'expense'; monthlyLimit: number }[] = [
  { name: 'Dad and Tera', kind: 'income', monthlyLimit: 300 },
  { name: 'Mom', kind: 'income', monthlyLimit: 500 },
  { name: 'Kitchen Staff', kind: 'income', monthlyLimit: 1125 },
  { name: 'Rent', kind: 'expense', monthlyLimit: 1000 },
  { name: 'Utilities', kind: 'expense', monthlyLimit: 100 },
  { name: 'Groceries/Food', kind: 'expense', monthlyLimit: 450 },
  { name: 'Books', kind: 'expense', monthlyLimit: 150 },
  { name: 'Fun/Spending', kind: 'expense', monthlyLimit: 100 },
  { name: 'Contingency', kind: 'expense', monthlyLimit: 200 },
]

export function Budget() {
  const [simplefinConfigured, setSimplefinConfigured] = useState<boolean | null>(null)
  const [simplefinAccounts, setSimplefinAccounts] = useState<SimplefinAccount[]>([])
  const [simplefinTransactions, setSimplefinTransactions] = useState<SimplefinTransaction[]>([])
  const [simplefinSyncing, setSimplefinSyncing] = useState(false)
  const [simplefinError, setSimplefinError] = useState<string | null>(null)

  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<{
    income: number
    expenses: number
    balance: number
    byCategory: { categoryId: string; name: string; spent: number; limit: number }[]
  } | null>(null)
  const [month, setMonth] = useState(currentMonth())

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
  const [seeding, setSeeding] = useState(false)

  const [selectedAccount, setSelectedAccount] = useState<SimplefinAccount | null>(null)
  const [selectedBankTx, setSelectedBankTx] = useState<SimplefinTransaction | null>(null)
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [txSearch, setTxSearch] = useState('')
  const [editTxDescription, setEditTxDescription] = useState('')
  const [savingTxDescription, setSavingTxDescription] = useState(false)

  async function refresh() {
    const [cats, txs, sum, simplefinStatus] = await Promise.all([
      window.api.budget.listCategories(),
      window.api.budget.listTransactions(month),
      window.api.budget.summary(month),
      window.api.simplefin.getStatus(),
    ])
    setCategories(cats)
    setTransactions(txs)
    setSummary(sum)
    if (!txCategoryId && cats.length > 0) setTxCategoryId(cats[0].id)
    setSimplefinConfigured(simplefinStatus.configured)
    if (simplefinStatus.configured) {
      const [accounts, bankTxs] = await Promise.all([
        window.api.simplefin.listAccounts(),
        window.api.simplefin.listTransactions(),
      ])
      setSimplefinAccounts(accounts)
      setSimplefinTransactions(bankTxs)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  async function syncSimplefin() {
    setSimplefinSyncing(true)
    setSimplefinError(null)
    try {
      const { accounts, transactions: bankTxs } = await window.api.simplefin.sync()
      setSimplefinAccounts(accounts)
      setSimplefinTransactions(bankTxs)
    } catch (e) {
      setSimplefinError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSimplefinSyncing(false)
    }
  }

  async function seedCollegeBudget() {
    setSeeding(true)
    setBudgetError(null)
    try {
      const existingNames = new Set(categories.map((c) => c.name.toLowerCase()))
      for (const cat of COLLEGE_BUDGET_SEED) {
        if (existingNames.has(cat.name.toLowerCase())) continue
        await window.api.budget.createCategory(cat)
      }
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not set up the budget')
    } finally {
      setSeeding(false)
    }
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

  function openTx(t: Transaction) {
    setSelectedTx(t)
    setEditTxDescription(t.description ?? '')
  }

  async function saveTransactionDescription() {
    if (!selectedTx || !editTxDescription.trim()) return
    setSavingTxDescription(true)
    setBudgetError(null)
    try {
      const updated = await window.api.budget.updateTransactionDescription(selectedTx.id, editTxDescription.trim())
      setSelectedTx(updated)
      await refresh()
    } catch (e) {
      setBudgetError(e instanceof Error ? e.message : 'Could not rename transaction')
    } finally {
      setSavingTxDescription(false)
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

  const kindByCategoryId = new Map(categories.map((c) => [c.id, c.kind]))
  const balancePoints = (() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    )
    let running = 0
    const points = sorted.map((t) => {
      const kind = kindByCategoryId.get(t.categoryId)
      running += kind === 'income' ? t.amount : -t.amount
      return {
        label: new Date(t.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: running,
      }
    })
    return points.length > 0 ? [{ label: 'Start of month', value: 0 }, ...points] : points
  })()

  const isCurrentMonth = month === currentMonth()

  return (
    <div>
      <div className="week-calendar-toolbar" style={{ marginBottom: 20 }}>
        <div className="week-calendar-range">{monthLabel(month)}</div>
        <div className="week-calendar-nav">
          <button className="btn btn-sm" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            ‹ Prev
          </button>
          <button className="btn btn-sm" onClick={() => setMonth(currentMonth())} disabled={isCurrentMonth}>
            This month
          </button>
          <button className="btn btn-sm" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={isCurrentMonth}>
            Next ›
          </button>
        </div>
      </div>

      <div className="card hero-card" style={{ marginBottom: 20 }}>
        <h3>Balance trend {isCurrentMonth ? 'this month' : `— ${monthLabel(month)}`}</h3>
        <div className="finance-pulse-top">
          <span className="finance-pulse-value">{formatMoney(summary?.balance ?? 0)}</span>
          <div className="finance-pulse-deltas">
            <span className="finance-pulse-pill up">↑ {formatMoney(summary?.income ?? 0)}</span>
            <span className="finance-pulse-pill down">↓ {formatMoney(summary?.expenses ?? 0)}</span>
          </div>
        </div>
        <Sparkline points={balancePoints} color="var(--accent)" formatValue={(v) => formatMoney(v)} />
      </div>

      {simplefinConfigured && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>
            <span className="heading-with-icon">
              <span aria-hidden="true">🏦</span>
              Bank accounts (SimpleFIN)
            </span>
            <button className="btn btn-sm" onClick={syncSimplefin} disabled={simplefinSyncing}>
              {simplefinSyncing ? 'Syncing…' : 'Sync'}
            </button>
          </h3>
          {simplefinError && (
            <p className="muted" style={{ color: 'var(--danger)', marginBottom: 10 }}>
              {simplefinError}
            </p>
          )}
          {simplefinAccounts.length === 0 ? (
            <div className="empty-state">No accounts synced yet — click "Sync".</div>
          ) : (
            <div className="list">
              {simplefinAccounts.map((a) => (
                <button key={a.id} className="fin-row" onClick={() => setSelectedAccount(a)}>
                  <Glyph label={a.orgName ?? a.name} />
                  <div className="fin-row-main">
                    <div className="fin-row-title">{a.name}</div>
                    <div className="fin-row-sub">{a.orgName ?? 'Bank'}</div>
                  </div>
                  <div className="fin-row-amount">{formatMoney(a.balance)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {simplefinConfigured && simplefinTransactions.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Bank transactions (SimpleFIN)</h3>
          <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
            Every sync automatically files new transactions into a matching budget category below — reassign any
            that get miscategorized from the "Recent transactions" list.
          </p>
          <div className="list">
            {simplefinTransactions.slice(0, 15).map((t) => (
              <button key={t.id} className="fin-row" onClick={() => setSelectedBankTx(t)}>
                <Glyph label={t.description} />
                <div className="fin-row-main">
                  <div className="fin-row-title">{t.description}</div>
                  <div className="fin-row-sub">
                    {new Date(t.date).toLocaleDateString()}
                    {t.pending && ' · pending'}
                  </div>
                </div>
                <div className="fin-row-amount" style={{ color: t.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {formatMoney(Math.abs(t.amount))}
                </div>
              </button>
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
          {categories.length === 0 && (
            <div className="empty-state" style={{ marginBottom: 14 }}>
              <p style={{ marginBottom: 10 }}>
                Set up your college budget in one click — Dad and Tera ($300), Mom ($500), and Kitchen Staff
                ($1,125) as income; Rent ($1,000), Utilities ($100), Groceries/Food ($450), Books ($150),
                Fun/Spending ($100), and Contingency ($200) as expenses. You can edit any of these afterward.
              </p>
              <button className="btn btn-primary" onClick={seedCollegeBudget} disabled={seeding}>
                {seeding ? 'Setting up…' : 'Set up my college budget'}
              </button>
            </div>
          )}
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
                const near = !over && c.limit > 0 && c.spent / c.limit >= 0.85
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
                        <button
                          onClick={() => setSelectedCategoryId(c.categoryId)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                          }}
                        >
                          <div
                            style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}
                          >
                            <span>
                              {c.name}
                              {over && (
                                <span className="badge" style={{ marginLeft: 6, color: 'var(--danger)' }}>
                                  over
                                </span>
                              )}
                              {near && (
                                <span className="badge" style={{ marginLeft: 6, color: 'var(--warning)' }}>
                                  near limit
                                </span>
                              )}
                            </span>
                            <span className="muted">
                              {formatMoney(c.spent)} {c.limit > 0 ? `/ ${formatMoney(c.limit)}` : ''}
                            </span>
                          </div>
                          <div className="progress-bar">
                            <div
                              className={`progress-bar-fill${over ? ' over' : near ? ' near' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
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
            <>
              <div className="fin-filter-bar">
                <div className="fin-search-wrap">
                  <span className="fin-search-icon" aria-hidden="true">
                    🔎
                  </span>
                  <input
                    placeholder="Search description or category…"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                  />
                </div>
              </div>
              {(() => {
                const filtered = transactions.filter((t) => {
                  if (!txSearch.trim()) return true
                  const haystack = `${t.description ?? ''} ${categoryName(t.categoryId)}`.toLowerCase()
                  return haystack.includes(txSearch.trim().toLowerCase())
                })
                return filtered.length === 0 ? (
                  <div className="empty-state">No transactions match "{txSearch}".</div>
                ) : (
                  <div className="list">
                    {filtered.map((t) => (
                      <button key={t.id} className="fin-row" onClick={() => openTx(t)}>
                        <Glyph label={t.description || categoryName(t.categoryId)} />
                        <div className="fin-row-main">
                          <div className="fin-row-title">
                            {t.description || categoryName(t.categoryId)}
                            {(t.simplefinTransactionId || t.plaidTransactionId) && (
                              <span className="badge" style={{ fontSize: 10 }} title="Auto-synced from your bank">
                                synced
                              </span>
                            )}
                          </div>
                          <div className="fin-row-sub">
                            {categoryName(t.categoryId)} · {new Date(t.occurredAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="fin-row-amount">{formatMoney(t.amount)}</div>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>

      <Drawer open={!!selectedAccount} onClose={() => setSelectedAccount(null)} title={selectedAccount?.name ?? ''}>
        {selectedAccount && (
          <>
            <div className="muted" style={{ marginBottom: 4 }}>
              {selectedAccount.orgName ?? 'Bank'}
            </div>
            <div className="fin-drawer-amount">{formatMoney(selectedAccount.balance)}</div>
            {selectedAccount.availableBalance != null && (
              <p className="muted" style={{ marginBottom: 18 }}>
                {formatMoney(selectedAccount.availableBalance)} available
              </p>
            )}
            <h3 style={{ fontSize: 13, marginBottom: 10 }}>Recent activity</h3>
            <div className="list">
              {simplefinTransactions
                .filter((t) => t.accountId === selectedAccount.id)
                .slice(0, 10)
                .map((t) => (
                  <div className="fin-row" key={t.id}>
                    <Glyph label={t.description} />
                    <div className="fin-row-main">
                      <div className="fin-row-title">{t.description}</div>
                      <div className="fin-row-sub">{new Date(t.date).toLocaleDateString()}</div>
                    </div>
                    <div className="fin-row-amount" style={{ color: t.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatMoney(Math.abs(t.amount))}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </Drawer>

      <Drawer open={!!selectedBankTx} onClose={() => setSelectedBankTx(null)} title="Transaction">
        {selectedBankTx && (
          <>
            <div className="fin-drawer-amount" style={{ color: selectedBankTx.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>
              {formatMoney(Math.abs(selectedBankTx.amount))}
            </div>
            <div className="muted" style={{ marginBottom: selectedBankTx.memo ? 4 : 18 }}>
              {selectedBankTx.description}
              {selectedBankTx.pending && ' · pending'}
            </div>
            {selectedBankTx.memo && (
              <div className="muted" style={{ marginBottom: 18, fontSize: 12 }}>
                {selectedBankTx.memo}
              </div>
            )}
            <div className="field">
              <label>Date</label>
              <div>{new Date(selectedBankTx.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            </div>
          </>
        )}
      </Drawer>

      <Drawer open={!!selectedTx} onClose={() => setSelectedTx(null)} title="Transaction">
        {selectedTx && (
          <>
            <div className="fin-drawer-amount">{formatMoney(selectedTx.amount)}</div>
            <p className="muted" style={{ marginBottom: 18 }}>
              {new Date(selectedTx.occurredAt).toLocaleDateString()}
              {selectedTx.simplefinTransactionId ? ' · synced from bank' : ''}
            </p>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Description</label>
              <div className="inline-form">
                <input
                  style={{ flex: 1 }}
                  value={editTxDescription}
                  onChange={(e) => setEditTxDescription(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveTransactionDescription()}
                  placeholder="e.g. Netflix, Spotify, landlord's name…"
                />
                <button className="btn btn-sm btn-primary" onClick={saveTransactionDescription} disabled={savingTxDescription}>
                  {savingTxDescription ? 'Saving…' : 'Save'}
                </button>
              </div>
              <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                Rename this to whatever's actually clearest — banks sometimes send generic labels like "recurring
                expense" instead of the merchant name.
              </p>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Category</label>
              <select
                value={selectedTx.categoryId}
                onChange={(e) => {
                  reassignTransaction(selectedTx.id, e.target.value)
                  setSelectedTx(null)
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-danger"
              onClick={() => {
                removeTransaction(selectedTx.id)
                setSelectedTx(null)
              }}
            >
              Delete transaction
            </button>
          </>
        )}
      </Drawer>

      <Drawer
        open={!!selectedCategoryId}
        onClose={() => setSelectedCategoryId(null)}
        title={categoryName(selectedCategoryId ?? '')}
      >
        {selectedCategoryId &&
          (() => {
            const catSummary = summary?.byCategory.find((c) => c.categoryId === selectedCategoryId)
            const catTransactions = transactions.filter((t) => t.categoryId === selectedCategoryId)
            return (
              <>
                <div className="fin-drawer-amount">{formatMoney(catSummary?.spent ?? 0)}</div>
                <p className="muted" style={{ marginBottom: 18 }}>
                  {catSummary && catSummary.limit > 0
                    ? `${formatMoney(catSummary.limit)} monthly limit — ${monthLabel(month)}`
                    : `No limit set — ${monthLabel(month)}`}
                </p>
                <h3 style={{ fontSize: 13, marginBottom: 10 }}>Transactions this period</h3>
                {catTransactions.length === 0 ? (
                  <div className="empty-state">Nothing logged in this category yet.</div>
                ) : (
                  <div className="list">
                    {catTransactions.map((t) => (
                      <div className="fin-row" key={t.id}>
                        <Glyph label={t.description || categoryName(t.categoryId)} />
                        <div className="fin-row-main">
                          <div className="fin-row-title">{t.description || categoryName(t.categoryId)}</div>
                          <div className="fin-row-sub">{new Date(t.occurredAt).toLocaleDateString()}</div>
                        </div>
                        <div className="fin-row-amount">{formatMoney(t.amount)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
      </Drawer>
    </div>
  )
}
