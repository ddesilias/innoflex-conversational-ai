'use client'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useEffect } from 'react'
import { useUIState, useAIState } from '@ai-sdk/rsc'
import { Message, Session } from '@/lib/types'
import { usePathname, useRouter } from 'next/navigation'
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor'
import { toast } from 'sonner'
import InteractiveAvatar from './avatar/interactive-avatar'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
  session?: Session
  missingKeys: string[]
}
export function Chat({ id, className, session, missingKeys }: ChatProps) {
  const router = useRouter()
  const path = usePathname()
  const [messages] = useUIState()
  const [aiState] = useAIState()
  const lastAImessage = aiState.messages[aiState.messages.length - 1]?.content
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
  })

  useEffect(() => {
    missingKeys.map(key => {
      toast.error(`Missing ${key} environment variable!`)
    })
  }, [missingKeys])
  useScrollAnchor()

  return (
    <>
      {session?.user ? (
        <InteractiveAvatar
          aiMessage={lastAImessage}
          messages={messages}
          isShared={false}
          session={session}
        />
      ) : (
        <div className="flex items-center justify-center min-h-screen w-full">
          <p>my landing page</p>
        </div>
      )}
    </>
  )
}
