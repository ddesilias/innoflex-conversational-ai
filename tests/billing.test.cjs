const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const exportsObject = {}
vm.runInNewContext(ts.transpileModule(readFileSync('lib/billing/checkout.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: exportsObject, URL })
const { testBillingConfig, createTestCheckout } = exportsObject
const env = { STRIPE_SECRET_KEY: 'sk_test_fake', STRIPE_TEST_PRICE_ID: 'price_test', BILLING_APP_ORIGIN: 'https://app.example.com' }
const account = { userId: 'alice', customerId: 'cus_alice', subscriptionExists: false }
const attempt = 'attempt_1234567890'
function client(override = {}) {
  const requests = []
  return { requests, prices: { retrieve: async () => ({ id: 'price_test', active: true, livemode: false, recurring: { interval: 'month' }, ...override }) }, checkout: { sessions: { create: async (params, options) => { requests.push({ params, options }); return { url: 'https://checkout.stripe.com/test' } } } } }
}
test('live keys and untrusted return origins are refused', () => {
  assert.throws(() => testBillingConfig({ ...env, STRIPE_SECRET_KEY: 'sk_live_fake' }))
  for (const origin of ['http://app.example.com', 'https://user:password@app.example.com', 'https://app.example.com/redirect', 'https://app.example.com/?next=evil']) {
    assert.throws(() => testBillingConfig({ ...env, BILLING_APP_ORIGIN: origin }))
  }
})
test('anonymous users and duplicate subscriptions cannot start checkout', async () => {
  const c = client()
  for (const user of [null, { ...account, subscriptionExists: true }]) {
    await assert.rejects(createTestCheckout(c, testBillingConfig(env), user, attempt))
  }
  assert.equal(c.requests.length, 0)
})
test('live, inactive and one-time prices are refused', async () => {
  for (const invalid of [{ livemode: true }, { active: false }, { recurring: null }]) {
    const c = client(invalid)
    await assert.rejects(createTestCheckout(c, testBillingConfig(env), account, attempt))
    assert.equal(c.requests.length, 0)
  }
})
test('checkout uses server price, customer and repeatable idempotency key', async () => {
  const c = client()
  for (let i = 0; i < 2; i++) await createTestCheckout(c, testBillingConfig(env), account, attempt)
  const [a,b] = c.requests
  assert.equal(a.params.line_items[0].price, 'price_test')
  assert.equal(a.params.customer, 'cus_alice')
  assert.equal(a.params.success_url, 'https://app.example.com/billing?checkout=returned')
  assert.equal(a.options.idempotencyKey, b.options.idempotencyKey)
  assert.equal(a.params.subscription_data.metadata.userId, 'alice')
})
