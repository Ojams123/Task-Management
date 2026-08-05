import { listCategories, recordAlertIfNew, summary } from './db/repos/budget'

// Once a category's spend crosses 85% of its monthly limit it's worth a
// heads-up before it's blown entirely — 'over' fires again at 100%+. Each
// (category, month, level) combination only ever fires once, enforced by
// recordAlertIfNew's UNIQUE constraint, so re-checking every 30s doesn't
// spam repeat notifications for the same crossing.
const NEAR_THRESHOLD = 0.85

export interface BudgetAlert {
  categoryId: string
  categoryName: string
  level: 'near' | 'over'
  spent: number
  limit: number
}

export function checkBudgetAlerts(): BudgetAlert[] {
  const month = new Date().toISOString().slice(0, 7)
  const kindByCategoryId = new Map(listCategories().map((c) => [c.id, c.kind]))
  const { byCategory } = summary(month)
  const alerts: BudgetAlert[] = []

  for (const c of byCategory) {
    if (kindByCategoryId.get(c.categoryId) !== 'expense') continue
    if (c.limit <= 0) continue
    const pct = c.spent / c.limit
    const level = pct >= 1 ? 'over' : pct >= NEAR_THRESHOLD ? 'near' : null
    if (!level) continue
    if (recordAlertIfNew(c.categoryId, month, level)) {
      alerts.push({ categoryId: c.categoryId, categoryName: c.name, level, spent: c.spent, limit: c.limit })
    }
  }

  return alerts
}
