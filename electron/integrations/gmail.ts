import { google } from 'googleapis'
import { clientFor } from './googleAuth'
import type { EmailSummaryItem } from '../../src/shared/types'

export async function fetchUnreadDigest(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  sinceIso: string | null
): Promise<EmailSummaryItem[]> {
  const auth = clientFor(clientId, clientSecret, refreshToken)
  const gmail = google.gmail({ version: 'v1', auth })

  const query = sinceIso
    ? `is:unread after:${Math.floor(new Date(sinceIso).getTime() / 1000)}`
    : 'is:unread'

  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 25 })
  const messages = list.data.messages ?? []

  const items: EmailSummaryItem[] = []
  for (const msg of messages) {
    if (!msg.id) continue
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    })
    const headers = full.data.payload?.headers ?? []
    const from = headers.find((h) => h.name === 'From')?.value ?? 'Unknown sender'
    const subject = headers.find((h) => h.name === 'Subject')?.value ?? '(no subject)'
    const date = headers.find((h) => h.name === 'Date')?.value
    items.push({
      id: msg.id,
      from,
      subject,
      receivedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      snippet: full.data.snippet ?? '',
    })
  }

  return items
}
