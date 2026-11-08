export class QuotaError extends Error {
  constructor(public status: number, public retryAfter = 0) {
    super(status === 429 ? 'Daily usage limit reached' : 'Usage control unavailable')
  }
}
// Redis's clock defines the UTC day; concurrent requests share one atomic counter.
export const quotaScript = `
local now = tonumber(redis.call('TIME')[1])
local day = math.floor(now / 86400)
local reset = (day + 1) * 86400
local previous = tonumber(redis.call('HGET', KEYS[1], 'day'))
local used = tonumber(redis.call('HGET', KEYS[1], 'used')) or 0
if previous ~= day then used = 0 end
if used >= tonumber(ARGV[1]) then return {0, reset - now} end
redis.call('HSET', KEYS[1], 'day', day, 'used', used + 1)
redis.call('EXPIRE', KEYS[1], reset - now)
return {1, reset - now}
`
export async function consumeQuota(
  evaluate: (script: string, keys: string[], args: number[]) => Promise<unknown>,
  userId: string,
  kind: 'ai' | 'avatar',
  setting: string | undefined
) {
  if (!userId) throw new QuotaError(401)
  if (!setting || !/^[1-9]\d{0,4}$/.test(setting) || Number(setting) > 10000) throw new QuotaError(503)
  let result: unknown
  try {
    result = await evaluate(quotaScript, [`usage:pilot:${kind}:${userId}`], [Number(setting)])
  } catch { throw new QuotaError(503) }
  if (!Array.isArray(result) || result.length !== 2 || ![0,1].includes(result[0]) ||
    !Number.isInteger(result[1]) || result[1] < 1 || result[1] > 86400) throw new QuotaError(503)
  if (result[0] !== 1) throw new QuotaError(429, result[1])
}
