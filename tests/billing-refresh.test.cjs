const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const { randomUUID } = require('node:crypto')
function setup(snapshot) {
  const calls = [], output = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/billing/refresh.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports: output, crypto: { randomUUID }, require: () => ({ reconcileKnownSubscription: async (...args) => { calls.push(args) } }) })
  return { calls, run: output.refreshTestSnapshot, store: { binding: async () => ({ userId: 'alice', subscriptionId: 'sub_one' }) }, read: async () => snapshot }
}
const now = 2000000
const snapshot = { userId: 'alice', customerId: 'cus_one', checkedAt: now }
test('fresh snapshots do not call the Stripe reconciliation path', async () => {
  const s = setup(snapshot)
  assert.equal(await s.run({}, s.store, s.read, 'alice', 'cus_one', 'price_one', now), snapshot)
  assert.equal(s.calls.length, 0)
})
test('stale snapshots refresh only their server-bound subscription', async () => {
  const s = setup({ ...snapshot, checkedAt: 0 })
  await s.run({}, s.store, s.read, 'alice', 'cus_one', 'price_one', now)
  assert.equal(s.calls.length, 1)
  assert.equal(s.calls[0][3], 'sub_one')
  assert.equal(s.calls[0][4], 'cus_one')
})
test('foreign snapshots are rejected before refreshing', async () => {
  const s = setup({ ...snapshot, userId: 'bob' })
  await assert.rejects(s.run({}, s.store, s.read, 'alice', 'cus_one', 'price_one', now))
  assert.equal(s.calls.length, 0)
})
test('missing initial subscription binding returns unknown without assigning rights', async () => {
  const s = setup(null); s.store.binding = async () => ({ userId: 'alice' })
  assert.equal(await s.run({}, s.store, s.read, 'alice', 'cus_one', 'price_one', now), null)
  assert.equal(s.calls.length, 0)
})
