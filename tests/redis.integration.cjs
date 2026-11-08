// Explicit opt-in test. Starts an ephemeral Redis container without ports or volumes.
const { before, after, test } = require('node:test')
const assert = require('node:assert/strict')
const { execFile, execFileSync } = require('node:child_process')
const { promisify } = require('node:util')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const exec = promisify(execFile)
let container
function load(file) {
  const output = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { exports: output, require: name => { if (name === '@vercel/kv') return { kv: {} }; throw Error(name) } })
  return output
}
const { quotaScript } = load('lib/security/quota.ts')
const { saveChatScript } = load('lib/security/save-chat.ts')
const { bindCustomerScript } = load('lib/billing/customer-store.ts')
const { commitBillingScript } = load('lib/billing/store.ts')
async function redis(...args) {
  const result = await exec('docker', ['exec', container, 'redis-cli', '--json', ...args.map(String)])
  const value = JSON.parse(result.stdout)
  if (value && value.error) throw Error(value.error)
  return value
}
async function evaluate(script, keys, args) { return redis('EVAL', script, keys.length, ...keys, ...args) }
before(async () => {
  container = `innoflex-security-test-${randomUUID()}`
  execFileSync('docker', ['run', '--detach', '--rm', '--name', container, '--network', 'none',
    'redis:7-alpine', 'redis-server', '--save', '', '--appendonly', 'no'], { stdio: 'pipe' })
  assert.equal(await redis('PING'), 'PONG')
})
after(() => { if (container) execFileSync('docker', ['rm', '-f', container], { stdio: 'pipe' }) })
test('Redis enforces a daily cap under concurrent requests', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => evaluate(quotaScript, ['quota:alice'], [3])))
  assert.equal(results.filter(r => r[0] === 1).length, 3)
  assert.equal(await redis('HGET', 'quota:alice', 'used'), '3')
  assert.ok(await redis('TTL', 'quota:alice') > 0)
  assert.equal((await evaluate(quotaScript, ['quota:bob'], [3]))[0], 1)
})
test('a previous-day counter resets without carrying usage forward', async () => {
  await redis('HSET', 'quota:old', 'day', '-1', 'used', '100')
  assert.equal((await evaluate(quotaScript, ['quota:old'], [1]))[0], 1)
  assert.equal((await evaluate(quotaScript, ['quota:old'], [1]))[0], 0)
})
test('concurrent chat ownership claims have exactly one owner', async () => {
  const save = user => evaluate(saveChatScript, ['chat:race', `user:chat:${user}`],
    [user, 'race', 'title', '"2026-11-08"', '/chat/race', '[]', 1])
  const results = await Promise.all([save('alice'), save('bob')])
  assert.equal(results.filter(r => r === 1).length, 1)
  const owner = await redis('HGET', 'chat:race', 'userId')
  assert.equal(await save(owner === 'alice' ? 'bob' : 'alice'), 0)
  await redis('HSET', 'chat:race', 'sharePath', '/share/race')
  assert.equal(await save(owner), 1)
  assert.equal(await redis('HGET', 'chat:race', 'sharePath'), '/share/race')
})
test('customer mapping refuses a second user for the same Stripe customer', async () => {
  const bind = user => evaluate(bindCustomerScript, [`customer:${user}`, 'binding:cus_test'], ['cus_test', user, JSON.stringify({ userId: user })])
  const results = await Promise.all([bind('alice'), bind('bob')])
  assert.equal(results.filter(r => r === 1).length, 1)
})
test('expired reconciliation lease cannot write or mark an event processed', async () => {
  const snapshot = { userId: 'alice', subscriptionId: 'sub_test' }
  const keys = ['billing:lock', 'billing:snapshot', 'billing:event', 'billing:binding']
  await redis('SET', keys[0], 'new-worker')
  await redis('SET', keys[3], JSON.stringify({ userId: 'alice' }))
  assert.equal(await evaluate(commitBillingScript, keys, ['old-worker', JSON.stringify(snapshot)]), 0)
  assert.equal(await redis('EXISTS', keys[1], keys[2]), 0)
  assert.equal(await evaluate(commitBillingScript, keys, ['new-worker', JSON.stringify(snapshot)]), 1)
  assert.equal(JSON.parse(await redis('GET', keys[3])).subscriptionId, 'sub_test')
  assert.equal(await redis('GET', keys[2]), '1')
})
