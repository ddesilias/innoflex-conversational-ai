import { modelMessageSchema, type ModelMessage } from 'ai'
import type { Message } from '@/lib/types'

/** Preserve stored v3 histories; convert legacy tool parts at the provider boundary. */
export function toModelMessages(messages: Message[]): ModelMessage[] {
  if (messages.length > 100 || JSON.stringify(messages).length > 64_000) throw new Error('Conversation too large')
  return messages.map(message => modelMessageSchema.parse({
    role: message.role,
    content: typeof message.content === 'string' ? message.content : message.content.map(part => {
      if (part.type === 'tool-call') return { type: part.type, toolName: part.toolName, toolCallId: part.toolCallId, input: part.args }
      return { type: 'tool-result', toolName: part.toolName, toolCallId: part.toolCallId, output: { type: 'json', value: part.result } }
    })
  }))
}
