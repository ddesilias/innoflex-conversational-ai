'use client'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useEffect } from 'react'
import { useUIState, useAIState } from '@ai-sdk/rsc'
import { Message, Session } from '@/lib/types'
import { usePathname, useRouter } from 'next/navigation'
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { toast } from 'sonner'
import { ChatList } from './chat-list'
import { EmptyScreen } from './empty-screen'
import InteractiveAvatarTextInput from './avatar/interactive-avatar-text-input'
import type { AI } from '@/lib/chat/actions'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  session?: Session
  missingKeys: string[]
}
export function Chat({ id, className, session, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [messages] = useUIState<typeof AI>()
  const [aiState] = useAIState()
  const [_, setNewChatId] = useLocalStorage('newChatId', id)
  useEffect(() => {
    if (session?.user) {
      if (!path.includes('chat') && messages.length === 1) {
        window.history.replaceState({}, '', `/chat/${id}`)
      }
    }
  }, [id, path, session?.user, messages])

  useEffect(() => {
    const messagesLength = aiState.messages?.length
    if (messagesLength === 2) {
      router.refresh()
    }
  }, [aiState.messages, router])

  useEffect(() => {
    setNewChatId(id)
  }, [id, setNewChatId])

  useEffect(() => {
    missingKeys.map(key => {
      toast.error(`Missing ${key} environment variable!`)
    })
  }, [missingKeys])
  const { messagesRef, visibilityRef } = useScrollAnchor()

  return (
    <>
      {session?.user ? (
        <div className={className}>
          <main ref={messagesRef} className="mx-auto w-full max-w-3xl pb-36">
            {messages.length ? <ChatList messages={messages} isShared={false} session={session} /> : <EmptyScreen />}
            <div ref={visibilityRef} className="h-px" />
          </main>
          <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background p-4 md:pl-64">
            <div className="mx-auto max-w-2xl">
              <InteractiveAvatarTextInput label="Votre message" placeholder="Décrivez ce que vous souhaitez préparer…" />
              <p className="mt-2 text-xs text-muted-foreground">Vérifiez les informations importantes avant de les utiliser.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-screen w-full">
          <p>Connectez-vous pour retrouver votre assistant personnel.</p>
        </div>
      )}
    </>
  )
}
