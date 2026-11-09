import { accountNamespace } from '@/lib/accounts/keys'

function prefix(env: NodeJS.ProcessEnv) {
  const namespace = accountNamespace(env)
  if (env.VERCEL_ENV === 'production') return ''
  const environment = env.VERCEL_ENV === 'preview' ? 'preview' : 'local'
  if (!namespace) throw Error('Chat namespace required')
  return `chat-env:${environment}:${namespace}:`
}

export function chatKey(id: string, env: NodeJS.ProcessEnv = process.env) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
    throw Error('Invalid conversation')
  return `${prefix(env)}chat:${id}`
}

export function chatIndexKey(
  userId: string,
  env: NodeJS.ProcessEnv = process.env
) {
  if (typeof userId !== 'string' || !userId || userId.length > 256)
    throw Error('Invalid identity')
  return `${prefix(env)}user:chat:${userId}`
}

export function indexedChatId(
  key: string,
  env: NodeJS.ProcessEnv = process.env
) {
  const start = `${prefix(env)}chat:`
  if (typeof key !== 'string' || !key.startsWith(start)) return null
  const id = key.slice(start.length)
  return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : null
}
