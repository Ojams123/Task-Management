import * as plaidRepo from '../db/repos/plaid'
import * as budgetRepo from '../db/repos/budget'
import type { BudgetCategory, PlaidTransaction } from '../../src/shared/types'

// Extra keywords per common category name, so a Plaid merchant/category string
// like "Food and Drink" or "Rent and Utilities" can match a budget category
// named e.g. "Groceries/Food" or "Rent" even without an exact word match.
const SYNONYMS: Record<string, string[]> = {
  rent: ['landlord', 'apartment', 'housing', 'lease'],
  utilities: ['utility', 'electric', 'power', 'water', 'gas', 'internet', 'wifi'],
  groceries: ['grocery', 'supermarket', 'market'],
  food: ['restaurant', 'dining', 'cafe', 'coffee', 'takeout', 'delivery'],
  fun: ['entertainment', 'recreation', 'movies', 'games', 'shopping'],
  spending: ['entertainment', 'recreation', 'shopping', 'retail'],
  books: ['bookstore', 'textbook', 'bookshop'],
  contingency: ['misc', 'miscellaneous', 'other'],
}

function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !['and', 'the', 'for'].includes(w))
}

function haystackFor(tx: PlaidTransaction): string {
  return `${tx.merchantName ?? ''} ${tx.name} ${tx.category ?? ''}`.toLowerCase()
}

function matchCategory(tx: PlaidTransaction, categories: BudgetCategory[]): BudgetCategory | null {
  const kind = tx.amount >= 0 ? 'expense' : 'income'
  const haystack = haystackFor(tx)
  let best: { category: BudgetCategory; hits: number } | null = null

  for (const category of categories.filter((c) => c.kind === kind)) {
    const words = tokenize(category.name)
    let hits = 0
    for (const word of words) {
      if (haystack.includes(word)) hits++
      for (const synonym of SYNONYMS[word] ?? []) {
        if (haystack.includes(synonym)) hits++
      }
    }
    if (hits > 0 && (!best || hits > best.hits)) best = { category, hits }
  }

  return best?.category ?? null
}

/**
 * Turns newly-synced Plaid transactions into real budget ledger entries, so
 * category spent-vs-limit totals reflect actual bank activity without manual
 * entry. Safe to call after every sync — already-linked Plaid transactions
 * are skipped via their stored plaidTransactionId.
 */
export function autoCategorizePlaidTransactions(): { created: number } {
  const allPlaidTransactions = plaidRepo.listCachedTransactions()
  const alreadyLinked = budgetRepo.linkedPlaidTransactionIds()
  const pending = allPlaidTransactions.filter((tx) => !alreadyLinked.has(tx.id) && tx.amount !== 0)
  if (pending.length === 0) return { created: 0 }

  let categories = budgetRepo.listCategories()
  let created = 0

  for (const tx of pending) {
    const kind = tx.amount >= 0 ? 'expense' : 'income'
    let category = matchCategory(tx, categories)
    if (!category) {
      category = budgetRepo.findOrCreateCategory('Uncategorized', kind)
      if (!categories.some((c) => c.id === category!.id)) categories = [...categories, category]
    }

    budgetRepo.createTransaction({
      categoryId: category.id,
      amount: Math.abs(tx.amount),
      description: tx.merchantName || tx.name,
      occurredAt: new Date(tx.date).toISOString(),
      plaidTransactionId: tx.id,
    })
    created++
  }

  return { created }
}
