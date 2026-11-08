const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const out = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/security/quota.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: out })
const { consumeQuota } = out
test('missing identity or invalid quota configuration never reaches storage', async () => {
  let calls = 0
  const evalScript = async () => { calls++; return [1, 100] }
  await assert.rejects(consumeQuota(evalScript, '', 'ai', '5'), e => e.status === 401)
  for (const value of [undefined, '0', '-1', '3.2', '10001']) await assert.rejects(consumeQuota(evalScript, 'alice', 'ai', value), e => e.status === 503)
  assert.equal(calls, 0)
})
test('quota exhaustion returns a retry delay and storage failures fail closed', async () => {
  await assert.rejects(consumeQuota(async () => [0, 100], 'alice', 'ai', '5'), e => e.status === 429 && e.retryAfter === 100)
  await assert.rejects(consumeQuota(async () => { throw Error('offline') }, 'alice', 'ai', '5'), e => e.status === 503)
  await assert.rejects(consumeQuota(async () => [1, -1], 'alice', 'ai', '5'), e => e.status === 503)
})
test('usage keys separate users and distinguish avatar tokens from AI calls', async () => {
  const keys = []
  const evalScript = async (script, key) => { keys.push(key[0]); return [1, 60] }
  await consumeQuota(evalScript, 'alice', 'ai', '5')
  await consumeQuota(evalScript, 'bob', 'ai', '5')
  await consumeQuota(evalScript, 'alice', 'avatar', '5')
  assert.equal(new Set(keys).size, 3)
})
