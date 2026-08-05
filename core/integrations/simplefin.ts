import type { SimplefinAccount, SimplefinTransaction } from '../../src/shared/types'

// SimpleFIN protocol (https://www.simplefin.org/protocol.html): a setup
// token is a base64-encoded "claim URL". POSTing to that URL (once — it's
// single-use) returns an "access URL" with HTTP Basic Auth credentials
// embedded (https://user:pass@bridge.simplefin.org/simplefin). That access
// URL is the long-lived credential — save it, the setup token stops working
// immediately after the claim succeeds.
export async function claimSetupToken(setupToken: string): Promise<string> {
  const claimUrl = Buffer.from(setupToken.trim(), 'base64').toString('utf-8')
  const res = await fetch(claimUrl, { method: 'POST' })
  if (!res.ok) {
    throw new Error(`Could not claim SimpleFIN setup token (${res.status}). It may already be used — generate a new one.`)
  }
  const accessUrl = (await res.text()).trim()
  if (!accessUrl.startsWith('http')) {
    throw new Error('SimpleFIN did not return a valid access URL.')
  }
  return accessUrl
}

// fetch() does not reliably send Basic Auth credentials embedded in a URL
// (browsers strip them; Node's implementation is inconsistent across
// versions), so pull them out and set the Authorization header explicitly.
function splitAccessUrl(accessUrl: string): { base: string; authHeader: string } {
  const url = new URL(accessUrl)
  const username = decodeURIComponent(url.username)
  const password = decodeURIComponent(url.password)
  url.username = ''
  url.password = ''
  return {
    base: url.toString().replace(/\/$/, ''),
    authHeader: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  }
}

interface SimplefinApiTransaction {
  id: string
  posted: number
  amount: string
  description: string
  // Not every bridge/institution populates these, but per the SimpleFIN
  // protocol some do — `payee` is often a cleaner merchant name than the
  // generic `description` some banks send for card/ACH activity (e.g.
  // "RECURRING EXPENSE"), and `memo` can carry extra detail either way.
  payee?: string
  memo?: string
  pending?: boolean
}

interface SimplefinApiAccount {
  id: string
  name: string
  currency: string | null
  balance: string
  'available-balance'?: string
  org?: { name?: string | null }
  transactions?: SimplefinApiTransaction[]
}

export async function fetchAccounts(
  accessUrl: string,
  days = 30
): Promise<{ accounts: Omit<SimplefinAccount, 'syncedAt'>[]; transactions: Omit<SimplefinTransaction, 'syncedAt'>[] }> {
  const { base, authHeader } = splitAccessUrl(accessUrl)
  const startDate = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
  const res = await fetch(`${base}/accounts?start-date=${startDate}&pending=1`, {
    headers: { Authorization: authHeader },
  })
  if (!res.ok) {
    throw new Error(`SimpleFIN API error ${res.status}. The connection may need to be re-established in Settings.`)
  }
  const json = (await res.json()) as { accounts: SimplefinApiAccount[]; errors?: string[] }

  const accounts: Omit<SimplefinAccount, 'syncedAt'>[] = []
  const transactions: Omit<SimplefinTransaction, 'syncedAt'>[] = []

  for (const a of json.accounts) {
    accounts.push({
      id: a.id,
      name: a.name,
      orgName: a.org?.name ?? null,
      currency: a.currency,
      balance: Number(a.balance),
      availableBalance: a['available-balance'] != null ? Number(a['available-balance']) : null,
    })
    for (const t of a.transactions ?? []) {
      const payee = t.payee?.trim()
      const memo = t.memo?.trim()
      transactions.push({
        id: t.id,
        accountId: a.id,
        amount: Number(t.amount),
        description: payee && payee.length > 0 ? payee : t.description,
        memo: memo && memo.length > 0 && memo !== payee ? memo : null,
        pending: !!t.pending,
        date: new Date(t.posted * 1000).toISOString(),
      })
    }
  }

  return { accounts, transactions }
}
