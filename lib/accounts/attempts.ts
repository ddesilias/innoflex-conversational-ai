import { createHash } from 'node:crypto'

export class AuthAttemptError extends Error {
  constructor(public status: 429 | 503, public retryAfter = 0) {
    super(status === 429 ? 'Too many authentication attempts' : 'Authentication protection unavailable')
  }
}
// Both counters are checked before either is incremented; denied attempts do
// not extend a lockout. Redis TTL supplies the authoritative retry delay.
export const authAttemptScript = `
local limits = {tonumber(ARGV[1]), tonumber(ARGV[3])}
local windows = {tonumber(ARGV[2]), tonumber(ARGV[4])}
for i = 1, 2 do
  local used = tonumber(redis.call('GET', KEYS[i])) or 0
  if used >= limits[i] then
    local ttl = redis.call('TTL', KEYS[i])
    if ttl < 1 then return {0, windows[i]} end
    return {0, ttl}
  end
end
for i = 1, 2 do
  local used = redis.call('INCR', KEYS[i])
  if used == 1 then redis.call('EXPIRE', KEYS[i], windows[i]) end
end
return {1, 0}
`
export async function consumeAuthAttempt(
  evaluate: (script: string, keys: string[], args: number[]) => Promise<unknown>,
  email: string,
  kind: 'login' | 'signup'
) {
  if (typeof email !== 'string' || email.length > 254 || !email.trim()) throw new AuthAttemptError(503)
  const identity = createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
  const limits = kind === 'login' ? [10, 900, 100, 60] : [3, 3600, 20, 60]
  let result: unknown
  try {
    result = await evaluate(authAttemptScript, [`auth-attempt:${kind}:${identity}`, `auth-attempt:${kind}:global`], limits)
  } catch { throw new AuthAttemptError(503) }
  if (!Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0]) ||
    !Number.isInteger(result[1]) || result[1] < 0 || result[1] > 3600 ||
    (result[0] === 0 && result[1] === 0) || (result[0] === 1 && result[1] !== 0)) throw new AuthAttemptError(503)
  if (result[0] === 0) throw new AuthAttemptError(429, result[1])
}
