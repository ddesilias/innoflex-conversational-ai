import { personalAssistantSystem } from '@/lib/ai/personal-assistant'
import { toModelMessages } from '@/lib/ai/messages'
import { configuredModel } from '@/lib/ai/config'
import { reserveUsage } from '@/lib/security/usage'
import 'server-only'

import {
  createAI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from '@ai-sdk/rsc'
import { openai } from '@ai-sdk/openai'

import {
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { Events } from '@/components/stocks/events'
import { Stocks } from '@/components/stocks/stocks'
import { nanoid } from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'
// Retained for old purchase cards; this action never executes a transaction.
async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'
  const message = <SystemMessage>Cette ancienne démonstration est désactivée. Aucun achat n’a été effectué.</SystemMessage>
  return {
    purchasingUI: message,
    newMessage: { id: nanoid(), display: message }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (typeof content !== 'string' || !content.trim() || content.length > 8000) throw new Error('Invalid message')
  await reserveUsage(session.user.id, 'ai')

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai(configuredModel(process.env.OPENAI_CHAT_MODEL)),
    maxOutputTokens: 1024,
    initial: <SpinnerMessage />,
    system: personalAssistantSystem,
    messages: toModelMessages(aiState.get().messages),
    text: ({ content, done }) => {
      if (!textStream) {
       
        textStream = createStreamableValue('')
        
        textNode = <BotMessage content={textStream.value} />
      }
      if (done) {
        textStream.done(content)
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(content)
      }

      return textNode
    },

  })
  return {
    id: nanoid(),
    display: result.value

  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState<typeof AI>()
      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: { messages: Message[]; chatId?: string; id?: string }) => {
  const chatId = aiState.chatId || aiState.id
  if (!chatId) return []
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
              typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
