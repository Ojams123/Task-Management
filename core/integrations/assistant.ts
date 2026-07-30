import Anthropic from '@anthropic-ai/sdk'
import { ASSISTANT_TOOLS, executeTool } from './assistantTools'
import type { ChatMessage } from '../../src/shared/types'

const MODEL = 'claude-sonnet-5'
const MAX_TOOL_ROUNDS = 6

function systemPrompt(): string {
  return `You are the built-in assistant inside DeviceHub, a personal organization desktop app.
Current date/time: ${new Date().toString()}.
You can create and update reminders, goals, budget transactions, food/exercise entries, and can look up the user's current reminders, goals, budget, Canvas assignments, and calendar events via tools. Use tools to take action whenever the user asks you to add/log/track something — don't just describe what you would do. Use get_overview before answering questions about what's due, owed, or upcoming, rather than guessing. Keep replies concise and conversational.`
}

function toApiHistory(history: ChatMessage[]): Anthropic.MessageParam[] {
  return history.map((m) => ({ role: m.role, content: m.content }))
}

export async function runAssistantTurn(
  apiKey: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const client = new Anthropic({ apiKey })
  const messages: Anthropic.MessageParam[] = [...toApiHistory(history), { role: 'user', content: userMessage }]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt(),
      messages,
      tools: ASSISTANT_TOOLS,
    })

    if (response.stop_reason !== 'tool_use') {
      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim()
    }

    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      let result: unknown
      try {
        result = executeTool(block.name, block.input as Record<string, unknown>)
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) }
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      })
    }
    messages.push({ role: 'user', content: toolResults })
  }

  return "Sorry, that took too many steps — could you break it into smaller requests?"
}
