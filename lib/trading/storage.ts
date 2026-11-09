import { accountNamespace } from '@/lib/accounts/keys'

export function tradingDraftKey(
  userId: string,
  env: NodeJS.ProcessEnv = process.env
) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) throw Error('Invalid identity')
  const namespace = accountNamespace(env)
  const environment =
    env.VERCEL_ENV === 'production'
      ? 'production'
      : env.VERCEL_ENV === 'preview'
        ? 'preview'
        : 'local'
  if (environment !== 'production' && !namespace)
    throw Error('Trading namespace required')
  return `trading:${environment}:${namespace || 'default'}:user:${userId}:draft`
}

// One working cycle per account. Compare-and-swap prevents a stale tab from
// overwriting a newer revision. No user identifier is accepted from the client.
export const saveTradingDraftScript = `
local revision = tonumber(redis.call('HGET', KEYS[1], 'revision') or '0')
if revision ~= tonumber(ARGV[1]) then return 0 end
redis.call('HSET', KEYS[1], 'revision', revision + 1, 'draft', ARGV[2])
return revision + 1
`

export function validCycleId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(default|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/.test(
      value
    )
  )
}
export function tradingCycleKey(
  userId: string,
  cycleId: string,
  env: NodeJS.ProcessEnv = process.env
) {
  if (!validCycleId(cycleId)) throw Error('Invalid cycle')
  const base = tradingDraftKey(userId, env)
  return cycleId === 'default' ? base : `${base}:cycle:${cycleId}`
}
export function tradingCycleIndexKey(
  userId: string,
  env: NodeJS.ProcessEnv = process.env
) {
  return `${tradingDraftKey(userId, env)}:cycles`
}
export const saveTradingCycleScript = `
local indexType = redis.call('TYPE', KEYS[2]).ok
if indexType ~= 'none' and indexType ~= 'hash' then return redis.error_reply('Invalid cycle index') end
local revision = tonumber(redis.call('HGET', KEYS[1], 'revision') or '0')
if revision ~= tonumber(ARGV[1]) then return 0 end
if redis.call('HEXISTS', KEYS[2], ARGV[3]) == 0 and redis.call('HLEN', KEYS[2]) >= 50 then return -1 end
redis.call('HSET', KEYS[1], 'revision', revision + 1, 'draft', ARGV[2])
redis.call('HSET', KEYS[2], ARGV[3], ARGV[4])
return revision + 1
`
