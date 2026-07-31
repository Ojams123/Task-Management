import type { PlaidAccount, PlaidTransaction } from '../../src/shared/types'

export type PlaidEnvironment = 'sandbox' | 'development' | 'production'

function baseUrl(environment: PlaidEnvironment): string {
  return `https://${environment}.plaid.com`
}

interface PlaidCredentials {
  clientId: string
  secret: string
  environment: PlaidEnvironment
}

async function plaidFetch<T>(creds: PlaidCredentials, path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${baseUrl(creds.environment)}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: creds.clientId, secret: creds.secret, ...body }),
  })
  const json = (await res.json()) as T & { error_message?: string }
  if (!res.ok) {
    throw new Error(json.error_message || `Plaid API error ${res.status}`)
  }
  return json
}

export async function createLinkToken(creds: PlaidCredentials, clientUserId: string): Promise<string> {
  const json = await plaidFetch<{ link_token: string }>(creds, '/link/token/create', {
    client_name: 'DeviceHub',
    language: 'en',
    country_codes: ['US'],
    user: { client_user_id: clientUserId },
    products: ['transactions'],
  })
  return json.link_token
}

export async function exchangePublicToken(
  creds: PlaidCredentials,
  publicToken: string
): Promise<{ accessToken: string; itemId: string }> {
  const json = await plaidFetch<{ access_token: string; item_id: string }>(creds, '/item/public_token/exchange', {
    public_token: publicToken,
  })
  return { accessToken: json.access_token, itemId: json.item_id }
}

export async function removeItem(creds: PlaidCredentials, accessToken: string): Promise<void> {
  await plaidFetch(creds, '/item/remove', { access_token: accessToken })
}

interface PlaidApiAccount {
  account_id: string
  name: string
  mask: string | null
  type: string | null
  subtype: string | null
  balances: {
    current: number | null
    available: number | null
    iso_currency_code: string | null
  }
}

export async function fetchAccounts(creds: PlaidCredentials, accessToken: string): Promise<Omit<PlaidAccount, 'itemId'>[]> {
  const json = await plaidFetch<{ accounts: PlaidApiAccount[] }>(creds, '/accounts/balance/get', {
    access_token: accessToken,
  })
  return json.accounts.map((a) => ({
    id: a.account_id,
    name: a.name,
    mask: a.mask,
    type: a.type,
    subtype: a.subtype,
    currentBalance: a.balances.current,
    availableBalance: a.balances.available,
    isoCurrencyCode: a.balances.iso_currency_code,
  }))
}

interface PlaidApiTransaction {
  transaction_id: string
  account_id: string
  amount: number
  iso_currency_code: string | null
  category: string[] | null
  merchant_name: string | null
  name: string
  pending: boolean
  date: string
}

export async function fetchTransactions(
  creds: PlaidCredentials,
  accessToken: string,
  days = 30
): Promise<Omit<PlaidTransaction, 'itemId'>[]> {
  const endDate = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const all: PlaidApiTransaction[] = []
  let total = Infinity
  let offset = 0
  while (all.length < total) {
    const json = await plaidFetch<{ transactions: PlaidApiTransaction[]; total_transactions: number }>(
      creds,
      '/transactions/get',
      { access_token: accessToken, start_date: startDate, end_date: endDate, options: { count: 100, offset } }
    )
    all.push(...json.transactions)
    total = json.total_transactions
    offset += json.transactions.length
    if (json.transactions.length === 0) break
  }

  return all.map((t) => ({
    id: t.transaction_id,
    accountId: t.account_id,
    amount: t.amount,
    isoCurrencyCode: t.iso_currency_code,
    category: t.category?.[t.category.length - 1] ?? null,
    merchantName: t.merchant_name,
    name: t.name,
    pending: t.pending,
    date: t.date,
  }))
}
