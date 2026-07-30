import { randomUUID } from 'node:crypto'
import { getDb } from '../index'
import type { ChatMessage } from '../../../src/shared/types'

export function listMessages(): ChatMessage[] {
  const db = getDb()
  return db.prepare('SELECT * FROM chat_messages ORDER BY createdAt ASC').all() as ChatMessage[]
}

export function addMessage(role: ChatMessage['role'], content: string): ChatMessage {
  const db = getDb()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  db.prepare('INSERT INTO chat_messages (id, role, content, createdAt) VALUES (?, ?, ?, ?)').run(
    id,
    role,
    content,
    createdAt
  )
  return { id, role, content, createdAt }
}

export function clearMessages() {
  const db = getDb()
  db.prepare('DELETE FROM chat_messages').run()
}
