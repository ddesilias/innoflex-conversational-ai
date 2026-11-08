import { kv } from '@vercel/kv'
import type { BillingSnapshot, BillingStore } from './reconcile'

const lockKey = (customer: string) => `billing:test:lock:${customer}`
// Fencing check prevents a worker whose lock expired from overwriting newer state.
export const commitBillingScript = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
local binding = redis.call('GET', KEYS[4])
if not binding then return 0 end
local owner = cjson.decode(binding)
local snapshot = cjson.decode(ARGV[2])
if owner.userId ~= snapshot.userId then return 0 end
if owner.subscriptionId and owner.subscriptionId ~= snapshot.subscriptionId then return 0 end
owner.subscriptionId = snapshot.subscriptionId
redis.call('SET', KEYS[4], cjson.encode(owner))
redis.call('SET', KEYS[2], ARGV[2])
redis.call('SET', KEYS[3], '1', 'EX', 2592000)
return 1
`
const unlockScript = `
if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end
return 0
`
export const testBillingStore: BillingStore = {
  async processed(event) { return !!await kv.get(`billing:test:event:${event}`) },
  async lock(customer, token) { return await kv.set(lockKey(customer), token, { nx: true, ex: 60 }) === 'OK' },
  async unlock(customer, token) { await kv.eval(unlockScript, [lockKey(customer)], [token]) },
  async binding(customer) { return kv.get(`billing:test:binding:${customer}`) },
  async commit(event, token, snapshot: BillingSnapshot) {
    const result = await kv.eval(commitBillingScript, [lockKey(snapshot.customerId),
      `billing:test:subscription:${snapshot.userId}`, `billing:test:event:${event}`,
      `billing:test:binding:${snapshot.customerId}`],
      [token, JSON.stringify(snapshot)])
    if (result !== 1) throw new Error('Reconciliation lease expired')
  }
}
