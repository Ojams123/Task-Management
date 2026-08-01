import Anthropic from '@anthropic-ai/sdk'
import { ASSISTANT_TOOLS, executeTool } from './assistantTools'
import type { ChatMessage } from '../../src/shared/types'

const MODEL = 'claude-sonnet-5'
const MAX_TOOL_ROUNDS = 6

function systemPrompt(): string {
  return `You are the built-in assistant inside DeviceHub, a personal organization desktop app.
Current date/time: ${new Date().toString()}.
You can create and update reminders, goals, budget transactions, and food/exercise entries. You can also create/delete Google Calendar events, sync the weather, control Spotify playback (play/pause/skip — requires Spotify Premium), log Strava activities, mark Canvas assignments done in the local checklist, and read/mark-as-read Gmail messages. Use tools to take action whenever the user asks you to add/log/track/create/delete/play/pause something — don't just describe what you would do. Use get_overview before answering questions about what's due, owed, upcoming, playing, or how they've been sleeping/recovering/spending, rather than guessing — it covers reminders, goals, budget, Canvas, calendar, fitness, Oura, bank accounts/transactions, weather, Spotify, Strava, Microsoft 365, and LinkedIn. For calendar/Canvas actions matched by title, confirm which item you acted on. Keep replies concise and conversational.`
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
        result = await executeTool(block.name, block.input as Record<string, unknown>)
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
