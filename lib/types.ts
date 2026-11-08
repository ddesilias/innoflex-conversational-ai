// Persisted history format, retained for compatibility with existing conversations.
export interface LegacyToolPart {
  type: 'tool-call' | 'tool-result'
  toolName: string
  toolCallId: string
  args?: unknown
  result?: unknown
}
export type Message = { id: string } & (
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | LegacyToolPart[] }
  | { role: 'tool'; content: LegacyToolPart[] }
)
export interface TextMessage { id: string; role: string; content: string }

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: Message[]
  sharePath?: string
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

export interface Session {
  user: {
    id: string
    email: string
  }
}

export interface AuthResult {
  type: string
  message: string
}

export interface User extends Record<string, any> {
  id: string
  email: string
  password: string
  salt: string
}
