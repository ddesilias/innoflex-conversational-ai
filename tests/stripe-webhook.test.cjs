const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const Stripe = require('stripe')
const stripe = new Stripe('sk_test_fake')
const secret = 'whsec_local_test_only'
const output = {}
vm.runInNewContext(ts.transpileModule(readFileSync('lib/billing/webhook.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
}).outputText, { exports: output, require, Response })
function request(override = {}, mutate = false) {
  const payload = JSON.stringify({ id: 'evt_test', type: 'customer.subscription.updated', livemode: false, data: { object: { id: 'sub_test' } }, ...override })
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret })
  return new Request('https://app.example.com/webhook', { method: 'POST', headers: { 'stripe-signature': signature }, body: mutate ? payload + ' ' : payload })
}
test('official Stripe signature verification rejects a modified payload', async () => {
  let calls = 0
  const handler = output.testWebhookHandler(stripe, secret, async () => { calls++ })
  assert.equal((await handler(request({}, true))).status, 400)
  assert.equal(calls, 0)
})
test('production and connected account events are refused before reconciliation', async () => {
  let calls = 0
  const handler = output.testWebhookHandler(stripe, secret, async () => { calls++ })
  for (const scope of [{ livemode: true }, { account: 'acct_other' }]) assert.equal((await handler(request(scope))).status, 400)
  assert.equal(calls, 0)
})
test('a persistence failure returns a retryable error', async () => {
  const handler = output.testWebhookHandler(stripe, secret, async () => { throw Error('storage failed') })
  assert.equal((await handler(request())).status, 503)
})
test('a valid signed subscription event is acknowledged after reconciliation', async () => {
  let reconciled = false
  const handler = output.testWebhookHandler(stripe, secret, async event => {
    assert.equal(event.id, 'evt_test'); reconciled = true
  })
  assert.equal((await handler(request())).status, 204)
  assert.equal(reconciled, true)
})
