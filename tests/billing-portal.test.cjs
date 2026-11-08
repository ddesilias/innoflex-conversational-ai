const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
function load(file) {
  const output = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: output, URL })
  return output
}
const { createTestPortal } = load('lib/billing/portal.ts')
const { safeStripeRedirect } = load('lib/billing/redirect.ts')
function setup(customer = { id: 'cus_alice', livemode: false, metadata: { userId: 'alice' } }) {
  const requests = []
  return { requests, store: { customer: async () => 'cus_alice' }, stripe: {
    customers: { retrieve: async () => customer },
    billingPortal: { sessions: { create: async params => { requests.push(params); return { livemode: false, url: 'https://billing.stripe.com/test' } } } }
  } }
}
test('portal uses server customer and fixed return URL', async () => {
  const s = setup()
  assert.equal(await createTestPortal(s.stripe, s.store, 'alice', 'https://app.example.com'), 'https://billing.stripe.com/test')
  assert.equal(s.requests[0].customer, 'cus_alice')
  assert.equal(s.requests[0].return_url, 'https://app.example.com/billing')
})
test('foreign, deleted and live customers never receive a portal session', async () => {
  for (const customer of [{ deleted: true }, { livemode: true }, { livemode: false, metadata: { userId: 'bob' } }]) {
    const s = setup(customer)
    await assert.rejects(createTestPortal(s.stripe, s.store, 'alice', 'https://app.example.com'))
    assert.equal(s.requests.length, 0)
  }
})
test('no customer mapping never creates a customer merely to open the portal', async () => {
  const s = setup(); s.store.customer = async () => null
  await assert.rejects(createTestPortal(s.stripe, s.store, 'alice', 'https://app.example.com'))
  assert.equal(s.requests.length, 0)
})
test('client redirects allow only exact Stripe HTTPS hosts', () => {
  for (const invalid of ['javascript:alert(1)', 'https://checkout.stripe.com.evil.example/', 'https://user:password@billing.stripe.com/', 'http://billing.stripe.com/', 'https://billing.stripe.com:444/', null]) {
    assert.equal(safeStripeRedirect(invalid), null)
  }
  assert.equal(safeStripeRedirect('https://checkout.stripe.com/test'), 'https://checkout.stripe.com/test')
})
