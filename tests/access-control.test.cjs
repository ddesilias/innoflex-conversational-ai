const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
function load(file, mocks) {
  const exports = {}
  const js = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText
  vm.runInNewContext(js, { exports, require: name => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`)
    return mocks[name]
  }, Response, process: { env: {} }, console })
  return exports
}
function actions(user, owner = 'bob') {
  const writes = [], reads = []
  const pipeline = { hmset: (...x) => writes.push(x), zadd: (...x) => writes.push(x), exec: async () => [] }
  const kv = { hgetall: async key => { reads.push(key); return owner ? { id: 'private', userId: owner } : null }, pipeline: () => pipeline, eval: async (script, keys, args) => {
    if (owner && owner !== args[0]) return 0
    writes.push([keys[0], { path: args[4] }]); return 1
  } }
  return { api: load('app/actions.ts', { 'next/cache': {}, 'next/navigation': {}, '@vercel/kv': { kv }, '@/lib/security/save-chat': load('lib/security/save-chat.ts', {}), '@/auth': { auth: async () => user ? { user: { id: user } } : null } }), reads, writes }
}
test('anonymous and forged identities cannot read private chats', async () => {
  for (const user of [null, 'alice']) {
    const { api, reads } = actions(user)
    assert.equal(await api.getChat('private', ''), null)
    assert.equal((await api.getChats('bob')).length, 0)
    if (!user) assert.equal(reads.length, 0)
  }
})
test('owner can read a chat using session identity', async () => {
  const { api } = actions('bob')
  assert.equal((await api.getChat('private', '')).userId, 'bob')
})
test('forged ownership and overwriting another user chat are refused', async () => {
  for (const userId of ['alice', 'bob']) {
    const { api, writes } = actions('alice')
    assert.equal((await api.saveChat({ id: 'private', userId })).error, 'Unauthorized')
    assert.equal(writes.length, 0)
  }
})
test('new chat sends server path and excludes client sharing fields from persistence', async () => {
  const { api, writes } = actions('alice', null)
  await api.saveChat({ id: 'new', userId: 'alice', path: '/forged', sharePath: '/share/new', messages: [] })
  assert.equal(writes[0][1].path, '/chat/new')
  assert.equal(writes[0][1].sharePath, undefined)
})
test('anonymous avatar requests never call a paid provider', async () => {
  for (const route of ['chat', 'get-access-token']) {
    let calls = 0
    const { POST } = load(`app/avatar/api/${route}/route.ts`, {
      '@/auth': { auth: async () => null },
      '@ai-sdk/openai': { openai: () => { calls++; throw Error('Provider called') } },
      ai: { streamText: () => { calls++; throw Error('Provider called') } }
    })
    assert.equal((await POST()).status, 401)
    assert.equal(calls, 0)
  }
})
