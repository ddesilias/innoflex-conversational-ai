import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { credentialVersion } from './session'
import { validPassword } from './password'

export const issueResetScript = `
if redis.call('HGET', KEYS[1], 'id') ~= ARGV[1] then return 0 end
local version = redis.call('HGET', KEYS[1], 'credentialVersion') or '0'
if version ~= ARGV[3] or redis.call('EXISTS', KEYS[2]) == 1 then return 0 end
redis.call('HSET', KEYS[2], 'userId', ARGV[1], 'email', ARGV[2], 'credentialVersion', ARGV[3])
redis.call('EXPIRE', KEYS[2], 900)
return 1
`
export const completeResetScript = `
if redis.call('HGET', KEYS[1], 'userId') ~= ARGV[1] or
   redis.call('HGET', KEYS[1], 'email') ~= ARGV[2] or
   redis.call('HGET', KEYS[1], 'credentialVersion') ~= ARGV[3] then return 0 end
if redis.call('HGET', KEYS[2], 'id') ~= ARGV[1] or
   redis.call('HGET', KEYS[2], 'email') ~= ARGV[2] then return 0 end
local version = redis.call('HGET', KEYS[2], 'credentialVersion') or '0'
if version ~= ARGV[3] then return 0 end
redis.call('HSET', KEYS[2], 'password', ARGV[4], 'salt', ARGV[5], 'credentialVersion', tonumber(version) + 1)
redis.call('DEL', KEYS[1])
return 1
`
type ResetRecord = { userId: string; email: string; credentialVersion?: unknown }
type Account = { id: string; email: string; credentialVersion?: unknown }
export interface ResetDependencies {
  accountKey?: (email: string) => string
  resetKey?: (digest: string) => string
  evaluate: (script: string, keys: string[], args: string[]) => Promise<unknown>
  readAccount: (email: string) => Promise<Account | null>
  readReset: (key: string) => Promise<ResetRecord | null>
  limit: (identity: string, kind: 'reset-request' | 'reset-confirm') => Promise<void>
  hash: (plaintext: string) => Promise<{ password: string; salt: string }>
}
const tokenKey = (deps: ResetDependencies, token: string) => {
  const digest = createHash('sha256').update(token).digest('hex')
  return deps.resetKey ? deps.resetKey(digest) : 'password-reset:' + digest
}
const accountKey = (deps: ResetDependencies, email: string) => deps.accountKey ? deps.accountKey(email) : `user:${email}`
// Internal server-only operation. The token must go to an approved delivery
// adapter, never a public action response or a log. No delivery is enabled yet.
export async function preparePasswordReset(deps: ResetDependencies, email: string) {
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Invalid reset request')
  await deps.limit(email, 'reset-request')
  const account = await deps.readAccount(email)
  if (!account || !account.id || account.email !== email) return null
  const version = credentialVersion(account.credentialVersion)
  if (version === null || version >= 999_999_999) throw Error('Account recovery unavailable')
  const token = randomBytes(32).toString('hex')
  const stored = await deps.evaluate(issueResetScript, [accountKey(deps, email), tokenKey(deps, token)], [account.id, email, String(version)])
  if (Number(stored) !== 1) throw Error('Account recovery unavailable')
  return { token, email }
}
export async function completePasswordReset(deps: ResetDependencies, token: string, password: string, confirmation: string) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || !validPassword(password, 12) || password !== confirmation) return false
  await deps.limit(token, 'reset-confirm')
  const key = tokenKey(deps, token)
  const record = await deps.readReset(key)
  if (!record || typeof record.userId !== 'string' || !record.userId || typeof record.email !== 'string' || record.email.length > 254) return false
  const version = credentialVersion(record.credentialVersion)
  if (version === null || version >= 999_999_999) return false
  const credential = await deps.hash(password)
  const result = await deps.evaluate(completeResetScript, [key, accountKey(deps, record.email)],
    [record.userId, record.email, String(version), credential.password, credential.salt])
  return Number(result) === 1
}
