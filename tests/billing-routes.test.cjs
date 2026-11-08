const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
function load(path, mocks) {
  const output = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText, { exports: output, Response, Date, require: name => {
    if (!(name in mocks)) throw Error(`Unexpected import ${name}`)
    return mocks[name]
  } })
  return output
}
const policy = load('lib/billing/reconcile.ts', {})
function status(user, config, snapshot) {
  const reads = []
  const route = load('app/api/billing/status/route.ts', {
    '@/auth': { auth: async () => user ? { user: { id: user } } : null },
    '@vercel/kv': { kv: { get: async key => { reads.push(key); return snapshot } } },
    '@/lib/billing/runtime': { testBillingRuntime: config },
    '@/lib/billing/reconcile': policy
  })
  return { ...route, reads }
}
test('anonymous status requests never consult Stripe or storage', async () => {
  const route = status(null, () => { throw Error('Must not run') })
  assert.equal((await route.GET()).status, 401)
  assert.equal(route.reads.length, 0)
})
test('missing test configuration closes the status endpoint', async () => {
  const route = status('alice', () => { throw Error('Not configured') })
  const response = await route.GET()
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(route.reads.length, 0)
})
test('status reads only the session user and refuses stale paid access', async () => {
  const route = status('alice', () => ({ verifyAccount: async () => {} }), {
    userId: 'alice', paid: true, status: 'active', validUntil: Date.now() + 3600000, checkedAt: Date.now() - 3600000
  })
  const body = await (await route.GET()).json()
  assert.deepEqual(route.reads, ['billing:test:subscription:alice', 'billing:test:customer:alice'])
  assert.equal(body.paidAccess, false)
  assert.equal(body.sync, 'refresh-required')
  assert.equal(body.customerId, undefined)
})
test('wrong Stripe account prevents storage access', async () => {
  const route = status('alice', () => ({ verifyAccount: async () => { throw Error('Wrong account') } }))
  assert.equal((await route.GET()).status, 503)
  assert.equal(route.reads.length, 0)
})
test('webhook endpoint remains closed without test configuration', async () => {
  const { POST } = load('app/api/billing/webhook/route.ts', {
    '@/lib/billing/runtime': { testBillingRuntime: () => { throw Error('Disabled') } },
    '@/lib/billing/webhook': {}, '@/lib/billing/reconcile': {}, '@/lib/billing/store': {}
  })
  assert.equal((await POST(new Request('https://example.com'))).status, 503)
})
