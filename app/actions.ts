'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { kv } from '@vercel/kv'

import { auth } from '@/auth'
import { type Chat } from '@/lib/types'
import { saveChatScript } from '@/lib/security/save-chat'
import { chatKey, chatIndexKey, indexedChatId } from '@/lib/chat/keys'
import {
  removeChatScript,
  shareChatScript
} from '@/lib/security/chat-mutations'

export async function getChats(userId?: string | null) {
  const session = await auth()
  if (!session?.user?.id || (userId && userId !== session.user.id)) {
    return []
  }
  userId = session.user.id

  try {
    const pipeline = kv.pipeline()
    const chats: string[] = await kv.zrange(chatIndexKey(userId), 0, -1, {
      rev: true
    })

    const keys = chats.filter(key => indexedChatId(key) !== null)
    if (!keys.length) return []
    for (const key of keys) pipeline.hgetall(key)
    const results = await pipeline.exec<Chat[]>()
    return results.filter(
      (chat, index) =>
        chat && chat.userId === userId && chat.id === indexedChatId(keys[index])
    )
  } catch (error) {
    return []
  }
}

export async function getChat(id: string, userId: string) {
  const session = await auth()
  if (!session?.user?.id || (userId && userId !== session.user.id)) return null
  const chat = await kv.hgetall<Chat>(chatKey(id))

  if (!chat || chat.userId !== session.user.id) {
    return null
  }

  return chat
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  const session = await auth()

  if (!session) {
    return {
      error: 'Unauthorized'
    }
  }

  if (!session.user?.id) return { error: 'Unauthorized' }
  const removed = await kv.eval(
    removeChatScript,
    [chatKey(id), chatIndexKey(session.user.id)],
    [session.user.id]
  )
  if (removed !== 1) return { error: 'Unauthorized' }

  revalidatePath('/')
  return revalidatePath(`/chat/${id}`)
}

export async function clearChats() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const chats: string[] = await kv.zrange(chatIndexKey(session.user.id), 0, -1)
  if (!chats.length) {
    return redirect('/')
  }
  for (const key of chats) {
    const id = indexedChatId(key)
    if (id === null) continue
    await kv.eval(
      removeChatScript,
      [chatKey(id), chatIndexKey(session.user.id)],
      [session.user.id]
    )
  }

  revalidatePath('/')
  return redirect('/')
}

export async function getSharedChat(id: string) {
  const chat = await kv.hgetall<Chat>(chatKey(id))

  if (!chat || !chat.sharePath) {
    return null
  }

  return chat
}

export async function shareChat(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      error: 'Unauthorized'
    }
  }

  const shared = await kv.eval(
    shareChatScript,
    [chatKey(id)],
    [session.user.id, `/share/${id}`]
  )
  if (shared !== 1) return { error: 'Unauthorized' }
  const chat = await getChat(id, session.user.id)
  if (!chat) return { error: 'Unauthorized' }
  return chat
}

export async function saveChat(chat: Chat) {
  const session = await auth()

  if (!session?.user?.id || chat.userId !== session.user.id) {
    return { error: 'Unauthorized' }
  }
  // Keep ownership check and writes together, including when an ID is first claimed.
  const saved = await kv.eval(
    saveChatScript,
    [chatKey(chat.id), chatIndexKey(session.user.id)],
    [
      session.user.id,
      chat.id,
      chat.title,
      JSON.stringify(chat.createdAt),
      `/chat/${chat.id}`,
      JSON.stringify(chat.messages),
      Date.now()
    ]
  )
  if (saved !== 1) return { error: 'Unauthorized' }
}

export async function refreshHistory(path: string) {
  redirect(path)
}

export async function getMissingKeys() {
  const keysRequired = ['OPENAI_API_KEY']
  return keysRequired
    .map(key => (process.env[key] ? '' : key))
    .filter(key => key !== '')
}
