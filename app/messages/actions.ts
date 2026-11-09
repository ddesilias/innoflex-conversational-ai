'use server'

import { auth } from '@/auth'
import { kv } from '@vercel/kv'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import {
  messagingPrefix,
  memberIndex,
  roomKey,
  validRoomId,
  createRoomScript,
  joinRoomScript,
  readRoomScript,
  renewInvitationScript,
  revokeInvitationScript,
  sendMessageScript
} from '@/lib/messaging/store'

export type PrivateMessage = {
  id: string
  text: string
  mine: boolean
  at: string
}
export type PrivateRoom = {
  id: string
  name: string
  joined: boolean
  isOwner: boolean
  invitationRevoked: boolean
  messages: PrivateMessage[]
}
const unavailable = {
  ok: false as const,
  message: 'Messagerie indisponible. Réessayez sans fermer votre brouillon.'
}
function invitationKey(token: string) {
  return (
    messagingPrefix() +
    'invite:' +
    createHash('sha256').update(token).digest('hex')
  )
}

async function readForUser(
  id: string,
  user: string
): Promise<PrivateRoom | null> {
  if (!validRoomId(id)) return null
  const key = roomKey(id)
  const raw = await kv.eval(readRoomScript, [key, key + ':messages'], [user])
  if (!raw) return null
  const room =
    typeof raw === 'string'
      ? JSON.parse(raw)
      : (raw as { name: string; joined: boolean; messages: string[] })
  if (
    room.messages &&
    !Array.isArray(room.messages) &&
    Object.keys(room.messages).length === 0
  )
    room.messages = []
  if (typeof room.name !== 'string' || !Array.isArray(room.messages))
    throw Error('Invalid room')
  const messages = room.messages.map((text: string) => {
    const m = typeof text === 'string' ? JSON.parse(text) : text
    if (
      typeof m.text !== 'string' ||
      typeof m.author !== 'string' ||
      typeof m.id !== 'string' ||
      typeof m.at !== 'string'
    )
      throw Error('Invalid message')
    return { id: m.id, text: m.text, mine: m.author === user, at: m.at }
  })
  return {
    id,
    name: room.name,
    joined: room.joined === true,
    isOwner: room.isOwner === true,
    invitationRevoked: room.invitationRevoked === true,
    messages
  }
}

export async function listPrivateRooms() {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false as const, message: 'Connexion requise.' }
  const userId = session.user.id
  try {
    const ids = await kv.smembers<string[]>(memberIndex(userId))
    const rooms = await Promise.all(
      ids
        .slice(0, 10)
        .filter(validRoomId)
        .map(id => readForUser(id, userId))
    )
    return {
      ok: true as const,
      rooms: rooms
        .filter((room): room is PrivateRoom => room !== null)
        .map(({ id, name, joined, invitationRevoked }) => ({
          id,
          name,
          joined,
          invitationRevoked
        }))
    }
  } catch {
    return unavailable
  }
}
export async function loadPrivateRoom(id: string) {
  const session = await auth()
  if (!session?.user?.id || !validRoomId(id))
    return { ok: false as const, message: 'Conversation inaccessible.' }
  try {
    const room = await readForUser(id, session.user.id)
    return room
      ? { ok: true as const, room }
      : { ok: false as const, message: 'Conversation inaccessible.' }
  } catch {
    return unavailable
  }
}
export async function createPrivateRoom(name: string) {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false as const, message: 'Connexion requise.' }
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
    return {
      ok: false as const,
      message: 'Indiquez un sujet de 1 à 80 caractères.'
    }
  try {
    const id = randomUUID(),
      token = randomBytes(32).toString('hex')
    const saved = await kv.eval(
      createRoomScript,
      [memberIndex(session.user.id), roomKey(id), invitationKey(token)],
      [session.user.id, name.trim(), new Date().toISOString(), id]
    )
    if (Number(saved) !== 1)
      return {
        ok: false as const,
        message:
          'Création refusée : limite de 10 conversations atteinte ou conflit temporaire.'
      }
    return { ok: true as const, id, invitation: id + '.' + token }
  } catch {
    return unavailable
  }
}
export async function joinPrivateRoom(invitation: string) {
  const session = await auth()
  if (!session?.user?.id)
    return { ok: false as const, message: 'Connexion requise.' }
  if (typeof invitation !== 'string' || invitation.length !== 101)
    return { ok: false as const, message: 'Invitation invalide ou expirée.' }
  const [id, token] = invitation.split('.')
  if (!validRoomId(id) || !/^[a-f0-9]{64}$/.test(token || ''))
    return { ok: false as const, message: 'Invitation invalide ou expirée.' }
  try {
    const joined = Number(
      await kv.eval(
        joinRoomScript,
        [invitationKey(token), roomKey(id), memberIndex(session.user.id)],
        [session.user.id, id]
      )
    )
    return joined === 1
      ? { ok: true as const, id }
      : {
          ok: false as const,
          message:
            'Invitation invalide, déjà utilisée, personnelle ou limite de conversations atteinte.'
        }
  } catch {
    return unavailable
  }
}
export async function renewPrivateInvitation(id: string) {
  const session = await auth()
  if (!session?.user?.id || !validRoomId(id))
    return { ok: false as const, message: 'Invitation inaccessible.' }
  try {
    const token = randomBytes(32).toString('hex')
    const result = Number(
      await kv.eval(
        renewInvitationScript,
        [
          roomKey(id),
          invitationKey(token),
          messagingPrefix() + 'invite-rate:' + session.user.id
        ],
        [session.user.id, id]
      )
    )
    return result === 1
      ? { ok: true as const, invitation: id + '.' + token }
      : {
          ok: false as const,
          message:
            result === -1
              ? 'Patientez une minute avant de créer un autre code.'
              : 'Seul le créateur peut remplacer un code avant son acceptation.'
        }
  } catch {
    return unavailable
  }
}
export async function revokePrivateInvitation(id: string) {
  const session = await auth()
  if (!session?.user?.id || !validRoomId(id))
    return { ok: false as const, message: 'Invitation inaccessible.' }
  try {
    const result = Number(
      await kv.eval(revokeInvitationScript, [roomKey(id)], [session.user.id])
    )
    return result === 1
      ? { ok: true as const }
      : {
          ok: false as const,
          message:
            'Seul le créateur peut révoquer un code avant son acceptation.'
        }
  } catch {
    return unavailable
  }
}
export async function sendPrivateMessage(
  id: string,
  text: string,
  messageId: string
) {
  const session = await auth()
  if (!session?.user?.id || !validRoomId(id))
    return { ok: false as const, message: 'Conversation inaccessible.' }
  if (
    !validRoomId(messageId) ||
    typeof text !== 'string' ||
    !text.trim() ||
    text.length > 2000
  )
    return {
      ok: false as const,
      message: 'Le message doit contenir entre 1 et 2 000 caractères.'
    }
  try {
    const key = roomKey(id)
    const message = JSON.stringify({
      id: messageId,
      author: session.user.id,
      text: text.trim(),
      at: new Date().toISOString()
    })
    const result = Number(
      await kv.eval(
        sendMessageScript,
        [key, key + ':messages', messagingPrefix() + 'rate:' + session.user.id],
        [session.user.id, messageId, message]
      )
    )
    return result === 1
      ? { ok: true as const }
      : {
          ok: false as const,
          message:
            result === -1
              ? 'Patientez une minute avant d’envoyer d’autres messages.'
              : 'Conversation inaccessible.'
        }
  } catch {
    return unavailable
  }
}
