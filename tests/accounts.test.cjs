const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const crypto = require('node:crypto')
const ts = require('typescript')
const vm = require('node:vm')
function load(file, mocks = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText, { exports, Buffer, require: name => {
    if (name === 'node:crypto') return crypto
    if (Object.hasOwn(mocks, name)) return mocks[name]
    throw Error(`Unexpected import ${name}`)
  } })
  return exports
}
const session = load('lib/accounts/session.ts')
const password = load('lib/accounts/password.ts')
const plaintext = 'a long personal password'
test('scrypt uses independent random salts and accepts only the correct password', async () => {
  const a = await password.hashPassword(plaintext)
  const b = await password.hashPassword(plaintext)
  assert.notEqual(a.salt, b.salt)
  assert.notEqual(a.password, b.password)
  assert.ok(a.password.startsWith('scrypt-v1$'))
  assert.equal(await password.verifyPassword(plaintext, a), true)
  assert.equal(await password.verifyPassword('wrong password', a), false)
  assert.equal(password.needsPasswordUpgrade(a.password), false)
})
test('legacy hashes remain verifiable and require migration; malformed records fail closed', async () => {
  const old = { salt: 'old-salt', password: crypto.createHash('sha256').update(plaintext + 'old-salt').digest('hex') }
  assert.equal(await password.verifyPassword(plaintext, old), true)
  assert.equal(await password.verifyPassword('wrong password', old), false)
  assert.equal(password.needsPasswordUpgrade(old.password), true)
  for (const record of [{ password: 'scrypt-v1$bad', salt: 'x' }, { password: 'invalid', salt: 'x' }, {}]) {
    assert.equal(await password.verifyPassword(plaintext, record), false)
  }
  await assert.rejects(password.hashPassword('x'.repeat(257)))
})
function accounts(kv) {
  return load('lib/accounts/store.ts', { 'server-only': {}, '@vercel/kv': { kv }, './session': session, './attempts': { consumeAuthAttempt: async () => {} }, './password': password })
}
test('successful legacy login migrates credentials and returns no stored password', async () => {
  const old = { id: 'alice', email: 'alice@example.com', salt: 'old', password: crypto.createHash('sha256').update(plaintext + 'old').digest('hex') }
  let replacement
  const api = accounts({ hgetall: async () => old, eval: async (script, keys, args) => { replacement = args; return 1 } })
  const result = await api.authenticateAccount(old.email, plaintext)
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { id: old.id, email: old.email, credentialVersion: 0 })
  assert.equal(replacement[1], old.password)
  assert.ok(replacement[3].startsWith('scrypt-v1$'))
  assert.equal(await password.verifyPassword(plaintext, { password: replacement[3], salt: replacement[4] }), true)
})
test('invalid login never writes and a concurrent credential change rejects the stale login', async () => {
  const old = { id: 'alice', email: 'alice@example.com', salt: 'old', password: crypto.createHash('sha256').update(plaintext + 'old').digest('hex') }
  let writes = 0
  const bad = accounts({ hgetall: async () => old, eval: async () => { writes++; return 1 } })
  assert.equal(await bad.authenticateAccount(old.email, 'wrong password'), null)
  assert.equal(writes, 0)
  const changed = await password.hashPassword('new password changed elsewhere')
  let reads = 0
  const racing = accounts({ hgetall: async () => ++reads === 1 ? old : { ...old, ...changed }, eval: async () => 0 })
  assert.equal(await racing.authenticateAccount(old.email, plaintext), null)
})
test('concurrent migration of the same password is accepted after re-verification', async () => {
  const old = { id: 'alice', email: 'alice@example.com', salt: 'old', password: crypto.createHash('sha256').update(plaintext + 'old').digest('hex') }
  const migrated = await password.hashPassword(plaintext)
  let reads = 0
  const api = accounts({ hgetall: async () => ++reads === 1 ? old : { ...old, ...migrated }, eval: async () => 0 })
  assert.equal((await api.authenticateAccount(old.email, plaintext)).id, old.id)
})
test('account creation hashes before persistence and does not expose credentials to its caller', async () => {
  let args
  const api = accounts({ eval: async (_, keys, values) => { args = values; return 1 } })
  assert.equal(await api.createAccount('new@example.com', plaintext), true)
  assert.ok(!args.includes(plaintext))
  assert.equal(await password.verifyPassword(plaintext, { password: args[2], salt: args[3] }), true)
})

test('denied attempts prevent account reads, hashing, and writes', async () => {
  let work = 0;
  const api = load('lib/accounts/store.ts', {
    'server-only': {}, '@vercel/kv': {kv:{hgetall:async()=>{work++},eval:async()=>{work++}}},
    './session': session, './attempts': {consumeAuthAttempt:async()=>{throw Error('blocked')}},
    './password': {hashPassword:async()=>{work++},verifyPassword:async()=>{work++}}
  });
  await assert.rejects(api.authenticateAccount('a@example.test', plaintext), /blocked/);
  await assert.rejects(api.createAccount('a@example.test', plaintext), /blocked/);
  assert.equal(work, 0);
});
