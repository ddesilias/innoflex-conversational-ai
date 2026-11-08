const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
function load(file, mocks = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText, { exports, Response, Date, require: name => {
    if (!(name in mocks)) throw Error(`Unexpected import ${name}`)
    return mocks[name]
  } })
  return exports
}
const customer = load('lib/billing/customer.ts')
const checkout = load('lib/billing/checkout.ts')
const { startTestCheckout } = load('lib/billing/start-checkout.ts', { './customer': customer, './checkout': checkout })
const config = { priceId: 'price_test', origin: 'https://app.example.com' }
const timestamp = 2_000_000
function setup() {
  const creates = [], sessions = []; let mapped = null, failBind = false
  const store = {
    customer: async () => mapped,
    intent: async () => ({ id: 'customer_intent_123456', createdAt: timestamp }),
    bind: async (user, id) => { if (failBind) throw Error('storage unavailable'); mapped = id }
  }
  const attempts = { intent: async () => ({ id: 'checkout_attempt_123456', priceId: 'price_test', createdAt: timestamp }) }
  const stripe = {
    customers: { create: async (params, opts) => { creates.push(opts.idempotencyKey); return { id: 'cus_one', livemode: false, metadata: params.metadata } } },
    subscriptions: { list: async () => ({ data: [], has_more: false }) },
    prices: { retrieve: async () => ({ id: 'price_test', active: true, livemode: false, recurring: {} }) },
    checkout: { sessions: { create: async (params, opts) => { sessions.push({ params, opts }); return { url: 'https://checkout.stripe.com/test' } } } }
  }
  return { stripe, store, attempts, creates, sessions, set failBind(x) { failBind = x } }
}
test('customer mapping persistence failure retries the same Stripe idempotency key', async () => {
  const s = setup(); s.failBind = true
  await assert.rejects(customer.ensureTestCustomer(s.stripe, s.store, 'alice', timestamp))
  s.failBind = false
  assert.equal(await customer.ensureTestCustomer(s.stripe, s.store, 'alice', timestamp), 'cus_one')
  assert.equal(s.creates[0], s.creates[1])
  await customer.ensureTestCustomer(s.stripe, s.store, 'alice', timestamp)
  assert.equal(s.creates.length, 2)
})
test('uncertain old customer creation is refused before any Stripe write', async () => {
  const s = setup()
  await assert.rejects(customer.ensureTestCustomer(s.stripe, s.store, 'alice', timestamp + 24 * 3600000))
  assert.equal(s.creates.length, 0)
})
test('repeated checkout uses the mapped customer and durable attempt', async () => {
  const s = setup()
  await startTestCheckout(s.stripe, s.store, s.attempts, config, 'alice', timestamp)
  await startTestCheckout(s.stripe, s.store, s.attempts, config, 'alice', timestamp)
  assert.equal(s.creates.length, 1)
  assert.equal(s.sessions[0].params.customer, 'cus_one')
  assert.equal(s.sessions[0].opts.idempotencyKey, s.sessions[1].opts.idempotencyKey)
})
test('outstanding subscription and uncertain checkout both block session creation', async () => {
  const s = setup()
  s.stripe.subscriptions.list = async () => ({ data: [{ status: 'incomplete' }], has_more: false })
  await assert.rejects(startTestCheckout(s.stripe, s.store, s.attempts, config, 'alice', timestamp))
  s.attempts.intent = async () => ({ id: 'old_attempt_123456', priceId: 'price_test', createdAt: 0 })
  await assert.rejects(startTestCheckout(s.stripe, s.store, s.attempts, config, 'alice', 24 * 3600000))
  assert.equal(s.sessions.length, 0)
})
test('cross-origin checkout never reaches Stripe', async () => {
  const { POST } = load('app/api/billing/checkout/route.ts', {
    '@/auth': { auth: async () => ({ user: { id: 'alice' } }) },
    '@/lib/billing/runtime': { testBillingRuntime: () => ({ config, verifyAccount: async () => { throw Error('Should not run') } }) },
    '@/lib/billing/start-checkout': { startTestCheckout: () => { throw Error('Should not run') } },
    '@/lib/billing/customer-store': {}, '@/lib/billing/checkout-store': {}
  })
  const result = await POST(new Request('https://app.example.com/api/billing/checkout', { method: 'POST', headers: { origin: 'https://foreign.example.com' } }))
  assert.equal(result.status, 403)
})
