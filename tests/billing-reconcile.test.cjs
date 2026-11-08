const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const out = {}
vm.runInNewContext(ts.transpileModule(readFileSync('lib/billing/reconcile.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText, { exports: out })
const now = 2_000_000
const event = { id: 'evt_one', livemode: false, data: { object: { id: 'sub_one', customer: 'cus_one', status: 'active' } } }
function setup(overrides = {}) {
  const seen = new Set(); let locked = false, snapshot = null, writes = 0, reads = 0
  const subscription = { id: 'sub_one', customer: 'cus_one', livemode: false, status: 'active', items: { data: [{ price: { id: 'price_allowed' }, current_period_end: 3000 }] }, ...overrides }
  const store = {
    processed: async id => seen.has(id),
    lock: async () => { if (locked) return false; locked = true; return true },
    unlock: async () => { locked = false },
    binding: async () => ({ userId: 'alice', subscriptionId: 'sub_one' }),
    commit: async (id, token, value) => { snapshot = value; writes++; seen.add(id) }
  }
  const stripe = { subscriptions: { retrieve: async () => { reads++; return subscription } } }
  return { store, stripe, subscription, run: out.subscriptionReconciler(stripe, store, 'price_allowed', () => now, () => 'token'), get snapshot() { return snapshot }, get writes() { return writes }, get reads() { return reads } }
}
test('duplicate delivery only persists a subscription once', async () => {
  const s = setup(); await s.run(event); await s.run(event)
  assert.equal(s.writes, 1); assert.equal(s.reads, 1)
})
test('an old active payload cannot reactivate a currently canceled subscription', async () => {
  const s = setup({ status: 'canceled' }); await s.run(event)
  assert.equal(s.snapshot.paid, false)
})
test('expired, paused, wrong-price and past-due subscriptions grant no paid access', async () => {
  for (const override of [{ status: 'past_due' }, { pause_collection: { behavior: 'void' } },
    { items: { data: [{ price: { id: 'other' }, current_period_end: 3000 }] } },
    { cancel_at: 1000 }]) {
    const s = setup(override); await s.run(event); assert.equal(s.snapshot.paid, false)
  }
})
test('foreign customers are rejected without recording the event', async () => {
  const s = setup({ customer: 'cus_foreign' })
  await assert.rejects(s.run(event)); assert.equal(s.writes, 0)
})
test('failed persistence is retried rather than marked processed', async () => {
  const s = setup(); const commit = s.store.commit; let fail = true
  s.store.commit = async (...args) => { if (fail) throw Error('unavailable'); return commit(...args) }
  await assert.rejects(s.run(event)); fail = false; await s.run(event)
  assert.equal(s.writes, 1)
})
test('concurrent deliveries cannot enter reconciliation together', async () => {
  const s = setup(); let release
  const original = s.stripe.subscriptions.retrieve
  const entered = new Promise(resolve => {
    s.stripe.subscriptions.retrieve = async () => { resolve(); await new Promise(r => { release = r }); return original() }
  })
  const first = s.run(event); await entered
  await assert.rejects(s.run({ ...event, id: 'evt_two' }), /busy/)
  release(); await first; assert.equal(s.writes, 1)
})
test('paid access expires, rejects another user and rejects stale observations', async () => {
  const s = setup(); await s.run(event)
  assert.equal(out.hasPaidAccess(s.snapshot, 'alice', now), true)
  assert.equal(out.hasPaidAccess(s.snapshot, 'bob', now), false)
  assert.equal(out.hasPaidAccess(s.snapshot, 'alice', now + 900_000), false)
  assert.equal(out.hasPaidAccess({ ...s.snapshot, validUntil: now }, 'alice', now), false)
})
