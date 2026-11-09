import * as React from 'react'

import { shareChat } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { IconShare } from '@/components/ui/icons'
import { FooterText } from '@/components/footer'
import { ChatShareDialog } from '@/components/chat-share-dialog'
import { useAIState, useActions, useUIState } from '@ai-sdk/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
}

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom
}: ChatPanelProps) {
  const [aiState] = useAIState()
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)

  const exampleMessages = [
    { heading: 'Rédiger un message', subheading: 'Trouver les mots justes', message: 'Aide-moi à rédiger un message clair et cordial. Demande-moi le destinataire et mon objectif.' },
    { heading: 'Organiser ma semaine', subheading: 'Passer des idées aux priorités', message: 'Aide-moi à préparer un planning réaliste pour ma semaine. Demande-moi mes priorités et mes contraintes.' },
    { heading: 'Comprendre un sujet', subheading: 'Une explication à mon niveau', message: 'Je voudrais mieux comprendre un sujet. Demande-moi lequel et ce que je connais déjà.' },
    { heading: 'Préparer une décision', subheading: 'Comparer les options', message: 'Aide-moi à comparer plusieurs options pour prendre une décision. Demande-moi le contexte et mes critères.' }
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-auto">
        <div className="pb-[200px] pt-4 md:pt-10 px-4 sm:px-0">
          {messages.length === 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {exampleMessages.map((example, index) => (
                <div
                  key={example.heading}
                  className={`cursor-pointer rounded-lg border bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
                    index > 1 && 'hidden md:block'
                  }`}
                  onClick={async () => {
                    setMessages(currentMessages => [
                      ...currentMessages,
                      {
                        id: nanoid(),
                        display: <UserMessage>{example.message}</UserMessage>
                      }
                    ])
                    
                    const responseMessage = await submitUserMessage(
                      example.message
                    )

                    setMessages(currentMessages => [
                      ...currentMessages,
                      responseMessage
                    ])
                  }}
                >
                  <div className="text-sm font-semibold">{example.heading}</div>
                  <div className="text-sm text-zinc-600">
                    {example.subheading}
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className="message">
                    {message.display}
                  </div>
                ))}
              </div>
              <FooterText className="hidden sm:block" />
            </div>
          )}

          {messages.length >= 2 && (
            <div className="flex h-12 items-center justify-center">
              <div className="flex space-x-2">
                {id && title && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShareDialogOpen(true)}
                    >
                      <IconShare className="mr-2" />
                      Partager
                    </Button>
                    <ChatShareDialog
                      open={shareDialogOpen}
                      onOpenChange={setShareDialogOpen}
                      onCopy={() => setShareDialogOpen(false)}
                      shareChat={shareChat}
                      chat={{
                        id,
                        title,
                        messages: aiState.messages
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />
    </div>
  )
}
