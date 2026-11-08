import { kv } from '@vercel/kv'
import type { CheckoutIntentStore } from './start-checkout'

const ensureIntentScript = `
local existing = redis.call('GET', KEYS[1])
if existing then return existing end
redis.call('SET', KEYS[1], ARGV[1])
return ARGV[1]
`
export const testCheckoutStore: CheckoutIntentStore = {
  async intent(user, priceId, now) {
    const result = await kv.eval(ensureIntentScript, [`billing:test:checkout-intent:${user}`],
      [JSON.stringify({ id: crypto.randomUUID(), priceId, createdAt: now })])
    return typeof result === 'string' ? JSON.parse(result) : result as { id: string; priceId: string; createdAt: number }
  }
}
