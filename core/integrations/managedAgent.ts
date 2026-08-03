import Anthropic from '@anthropic-ai/sdk'
import { ASSISTANT_TOOLS, executeTool } from './assistantTools'

const MAX_EVENTS = 200

export interface ManagedAgentConfig {
  apiKey: string
  agentId: string
  environmentId: string
  sessionId: string | null
}

export interface ManagedAgentResult {
  reply: string
  sessionId: string
}

function customTools() {
  return ASSISTANT_TOOLS.map((tool) => ({
    type: 'custom' as const,
    name: tool.name,
    description: tool.description ?? '',
    input_schema: {
      type: 'object' as const,
      properties: (tool.input_schema.properties ?? {}) as Record<string, unknown>,
      required: tool.input_schema.required as string[] | undefined,
    },
  }))
}

export async function runManagedAgentTurn(config: ManagedAgentConfig, userMessage: string): Promise<ManagedAgentResult> {
  const client = new Anthropic({ apiKey: config.apiKey })

  let sessionId = config.sessionId
  if (!sessionId) {
    const session = await client.beta.sessions.create({
      agent: {
        type: 'agent_with_overrides',
        id: config.agentId,
        tools: [{ type: 'agent_toolset_20260401' }, ...customTools()],
      },
      environment_id: config.environmentId,
      title: 'DeviceHub assistant',
    })
    sessionId = session.id
  }

  // Open the stream before sending the message so no events are missed.
  const stream = await client.beta.sessions.events.stream(sessionId)
  await client.beta.sessions.events.send(sessionId, {
    events: [{ type: 'user.message', content: [{ type: 'text', text: userMessage }] }],
  })

  const textParts: string[] = []
  let seen = 0

  for await (const event of stream) {
    seen++
    if (seen > MAX_EVENTS) {
      return { reply: "Sorry, that took too many steps — could you break it into smaller requests?", sessionId }
    }

    if (event.type === 'agent.message') {
      for (const block of event.content) {
        if (block.type === 'text') textParts.push(block.text)
      }
    } else if (event.type === 'agent.custom_tool_use') {
      let result: unknown
      let isError = false
      try {
        result = await executeTool(event.name, event.input as Record<string, unknown>)
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) }
        isError = true
      }
      await client.beta.sessions.events.send(sessionId, {
        events: [
          {
            type: 'user.custom_tool_result',
            custom_tool_use_id: event.id,
            content: [{ type: 'text', text: JSON.stringify(result) }],
            is_error: isError,
          },
        ],
      })
    } else if (event.type === 'session.status_terminated') {
      break
    } else if (event.type === 'session.status_idle') {
      if (event.stop_reason.type !== 'requires_action') break
    } else if (event.type === 'session.error') {
      textParts.push(`(session error: ${JSON.stringify(event.error)})`)
    }
  }

  return { reply: textParts.join('\n').trim() || '(The agent finished without a text reply.)', sessionId }
}
