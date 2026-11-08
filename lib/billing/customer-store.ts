import { kv } from '@vercel/kv'
import type { CustomerStore } from './customer'

// No expiry: an uncertain Stripe creation must not silently turn into a new customer later.
const intentScript = `
local existing = redis.call('GET', KEYS[1])
if existing then return existing end
redis.call('SET', KEYS[1], ARGV[1])
return ARGV[1]
`
export const bindCustomerScript = `
local existingCustomer = redis.call('GET', KEYS[1])
local existingBinding = redis.call('GET', KEYS[2])
if existingCustomer and existingCustomer ~= ARGV[1] then return 0 end
if existingBinding and cjson.decode(existingBinding).userId ~= ARGV[2] then return 0 end
redis.call('SET', KEYS[1], ARGV[1])
if not existingBinding then redis.call('SET', KEYS[2], ARGV[3]) end
return 1
`
export const testCustomerStore: CustomerStore = {
  async customer(user) { return kv.get(`billing:test:customer:${user}`) },
  async intent(user, now) {
    const raw = await kv.eval(intentScript, [`billing:test:customer-intent:${user}`],
      [JSON.stringify({ id: crypto.randomUUID(), createdAt: now })])
    // The Redis client can automatically deserialize JSON script results.
    return typeof raw === 'string' ? JSON.parse(raw) : raw as { id: string; createdAt: number }
  },
  async bind(user, customer) {
    const result = await kv.eval(bindCustomerScript,
      [`billing:test:customer:${user}`, `billing:test:binding:${customer}`],
      [customer, user, JSON.stringify({ userId: user })])
    if (result !== 1) throw new Error('Customer binding conflict')
  }
}
