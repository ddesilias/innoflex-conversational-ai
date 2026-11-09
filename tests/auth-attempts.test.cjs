const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const api = {}
vm.runInNewContext(ts.transpileModule(readFileSync('lib/accounts/attempts.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, {exports:api,require:name=>{if(name==='node:crypto')return require(name);throw Error(name)}})
const {consumeAuthAttempt,AuthAttemptError} = api

test('authentication attempts use opaque identity keys with separate login and signup budgets', async () => {
  const calls=[]
  const evaluate=async (...args)=>{calls.push(args);return [1,0]}
  await consumeAuthAttempt(evaluate,'Alice@example.com','login')
  await consumeAuthAttempt(evaluate,'alice@example.com','login')
  await consumeAuthAttempt(evaluate,'Alice@example.com','signup')
  assert.equal(calls[0][1][0],calls[1][1][0])
  assert.ok(!calls[0][1][0].includes('Alice'))
  assert.notEqual(calls[0][1][0],calls[2][1][0])
  assert.equal(JSON.stringify(calls[0][2]),JSON.stringify([10,900,100,60]))
  assert.equal(JSON.stringify(calls[2][2]),JSON.stringify([3,3600,20,60]))
})
test('a limit denial carries retry delay; persistence failures and malformed replies fail closed', async () => {
  await assert.rejects(consumeAuthAttempt(async()=>[0,899],'a@example.test','login'),error=>error instanceof AuthAttemptError && error.status===429 && error.retryAfter===899)
  for(const result of [null,[1],['1',0],[1,1],[0,0],[0,3601],[1,-1]]) {
    await assert.rejects(consumeAuthAttempt(async()=>result,'a@example.test','login'),error=>error.status===503)
  }
  await assert.rejects(consumeAuthAttempt(async()=>{throw Error('credentials in internal message')},'a@example.test','signup'),error=>error.status===503 && !error.message.includes('credentials'))
})
