import 'server-only'
import { consumeAuthAttempt } from './attempts'
import { kv } from '@vercel/kv'
import { randomUUID } from 'node:crypto'
import type { User } from '@/lib/types'
import { hashPassword, needsPasswordUpgrade, verifyPassword } from './password'

export const createAccountScript = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[1], 'id', ARGV[1], 'email', ARGV[2], 'password', ARGV[3], 'salt', ARGV[4])
return 1
`
export const upgradePasswordScript = `
if redis.call('HGET', KEYS[1], 'id') ~= ARGV[1] or
   redis.call('HGET', KEYS[1], 'password') ~= ARGV[2] or
   redis.call('HGET', KEYS[1], 'salt') ~= ARGV[3] then return 0 end
redis.call('HSET', KEYS[1], 'password', ARGV[4], 'salt', ARGV[5])
return 1
`
// This module is server-only, not a server-action entry point.
export async function createAccount(email: string, plaintext: string): Promise<boolean> {
  await consumeAuthAttempt((script, keys, args) => kv.eval(script, keys, args), email, 'signup')
  const credential = await hashPassword(plaintext)
  return Number(await kv.eval(createAccountScript, [`user:${email}`],
    [randomUUID(), email, credential.password, credential.salt])) === 1
}
export async function authenticateAccount(email: string, plaintext: string) {
  await consumeAuthAttempt((script, keys, args) => kv.eval(script, keys, args), email, 'login')
  const user = await kv.hgetall<User>(`user:${email}`)
  if (!user || !user.id || user.email !== email || !await verifyPassword(plaintext, user)) return null
  if (needsPasswordUpgrade(user.password)) {
    const credential = await hashPassword(plaintext)
    const upgraded = await kv.eval(upgradePasswordScript, [`user:${email}`],
      [user.id, user.password, user.salt, credential.password, credential.salt])
    // A concurrent login can migrate the same credential. Re-check the current
    // record so a concurrent credential change cannot authenticate stale data.
    if (Number(upgraded) !== 1) {
      const current = await kv.hgetall<User>(`user:${email}`)
      if (!current || current.id !== user.id || current.email !== email || !await verifyPassword(plaintext, current)) return null
    }
  }
  return { id: user.id, email: user.email }
}
