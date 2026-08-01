import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { ASSISTANT_TOOLS, executeTool } from './assistantTools'
import type { AssistantProvider, ChatMessage } from '../../src/shared/types'

const ANTHROPIC_MODEL = 'claude-sonnet-5'
const OPENAI_MODEL = 'gpt-4o'
const MAX_TOOL_ROUNDS = 6

function systemPrompt(): string {
  return `You are the built-in assistant inside DeviceHub, a personal organization desktop app.
Current date/time: ${new Date().toString()}.
You can create and update reminders, goals, budget transactions, and food/exercise entries. You can also create/delete Google Calendar events, sync the weather, control Spotify playback (play/pause/skip — requires Spotify Premium), log Strava activities, mark Canvas assignments done in the local checklist, and read/mark-as-read Gmail messages. Use tools to take action whenever the user asks you to add/log/track/create/delete/play/pause something — don't just describe what you would do. Use get_overview before answering questions about what's due, owed, upcoming, playing, or how they've been sleeping/recovering/spending, rather than guessing — it covers reminders, goals, budget, Canvas, calendar, fitness, Oura, bank accounts/transactions, weather, Spotify, Strava, Microsoft 365, and LinkedIn. For calendar/Canvas actions matched by title, confirm which item you acted on. Keep replies concise and conversational.`
}

async function runAnthropicTurn(apiKey: string, history: ChatMessage[], userMessage: string): Promise<string> {
  const client = new Anthropic({ apiKey })
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
    { role: 'user', content: userMessage },
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
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

function toOpenAITools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return ASSISTANT_TOOLS.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema as Record<string, unknown>,
    },
  }))
}

async function runOpenAITurn(apiKey: string, history: ChatMessage[], userMessage: string): Promise<string> {
  const client = new OpenAI({ apiKey })
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt() },
    ...history.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.Completions.ChatCompletionMessageParam),
    { role: 'user', content: userMessage },
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools: toOpenAITools(),
    })

    const choice = response.choices[0]
    const message = choice.message

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return (message.content ?? '').trim()
    }

    messages.push({
      role: 'assistant',
      content: message.content,
      tool_calls: message.tool_calls,
    })

    for (const call of message.tool_calls) {
      let result: unknown
      try {
        if (call.type !== 'function') {
          result = { error: `Unsupported tool call type: ${call.type}` }
        } else {
          const input = JSON.parse(call.function.arguments || '{}')
          result = await executeTool(call.function.name, input)
        }
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) }
      }
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
  }

  return "Sorry, that took too many steps — could you break it into smaller requests?"
}

export async function runAssistantTurn(
  provider: AssistantProvider,
  apiKey: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  return provider === 'openai'
    ? runOpenAITurn(apiKey, history, userMessage)
    : runAnthropicTurn(apiKey, history, userMessage)
}
