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
