const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const ai = require('ai')
const { MockLanguageModelV4 } = require('ai/test')
function load(file, mocks = {}, env = {}) {
  const output = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: output, Response, Uint8Array, process: { env }, require: name => {
      if (!(name in mocks)) throw Error(`Unexpected import: ${name}`)
      return mocks[name]
    } })
  return output
}
const { toModelMessages } = load('lib/ai/messages.ts', { ai })
const body = load('lib/security/read-body.ts')
const config = load('lib/ai/config.ts')
const quota = load('lib/security/quota.ts')
test('legacy tool histories convert to SDK 7 without changing stored messages', () => {
  const stored = [
    { id: 'u', role: 'user', content: 'Hello' },
    { id: 'a', role: 'assistant', content: [{ type: 'tool-call', toolName: 'lookup', toolCallId: 'call', args: { symbol: 'A' } }] },
    { id: 't', role: 'tool', content: [{ type: 'tool-result', toolName: 'lookup', toolCallId: 'call', result: { price: 10 } }] }
  ]
  const before = JSON.stringify(stored)
  const converted = toModelMessages(stored)
  assert.equal(converted[1].content[0].input.symbol, 'A')
  assert.equal(converted[2].content[0].output.type, 'json')
  assert.equal(converted[2].content[0].output.value.price, 10)
  assert.equal(JSON.stringify(stored), before)
})
test('invalid or oversized histories fail before any model call', () => {
  assert.throws(() => toModelMessages([{ role: 'unknown', content: 'bad' }]))
  assert.throws(() => toModelMessages([{ role: 'user', content: 'a'.repeat(64001) }]))
})
test('SDK 7 streams all chunks with a mock provider', async () => {
  const model = new MockLanguageModelV4({ doStream: async () => ({ stream: ai.simulateReadableStream({
    initialDelayInMs: 0, chunkDelayInMs: 0,
    chunks: [
      { type: 'text-start', id: 't' },
      { type: 'text-delta', id: 't', delta: 'Bonjour ' },
      { type: 'text-delta', id: 't', delta: 'INNOFLEX' },
      { type: 'text-end', id: 't' },
      { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage: {
        inputTokens: { total: 1, noCache: 1 }, outputTokens: { total: 2, text: 2 }
      } }
    ]
  }) }) })
  const result = ai.streamText({ model, messages: toModelMessages([{ id: 'u', role: 'user', content: 'Bonjour' }]), maxOutputTokens: 1024 })
  assert.equal(await result.toTextStreamResponse().text(), 'Bonjour INNOFLEX')
  assert.equal(model.doStreamCalls.length, 1)
})
test('request body size is enforced for streamed audio without trusting content-length', async () => {
  const request = new Request('https://example.com', { method: 'POST', body: new Uint8Array(8) })
  await assert.rejects(body.readLimitedBody(request, 4))
})
function transcription(user, limitError = null) {
  let calls = 0
  const { POST } = load('app/avatar/api/transcribe/route.ts', {
    '@/auth': { auth: async () => user ? { user: { id: user } } : null },
    '@/lib/ai/config': config, '@/lib/security/read-body': body,
    '@/lib/security/quota': quota,
    '@/lib/security/usage': { reserveUsage: async () => { if (limitError) throw limitError } },
    '@ai-sdk/openai': { openai: { transcription: () => ({}) } },
    ai: { transcribe: async () => { calls++; return { text: 'Transcription simulée' } } }
  }, { OPENAI_TRANSCRIPTION_MODEL: 'mock-model' })
  return { POST, get calls() { return calls } }
}
test('anonymous transcription and exhausted quota never reach a provider', async () => {
  const anonymous = transcription(null)
  assert.equal((await anonymous.POST(new Request('https://example.com'))).status, 401)
  assert.equal(anonymous.calls, 0)
  const denied = transcription('alice', new quota.QuotaError(429, 60))
  const response = await denied.POST(new Request('https://example.com', { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: new Uint8Array([1,2]) }))
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60'); assert.equal(denied.calls, 0)
})
test('authenticated transcription returns private text without exposing a key', async () => {
  const allowed = transcription('alice')
  const response = await allowed.POST(new Request('https://example.com', { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: new Uint8Array([1,2]) }))
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { text: 'Transcription simulée' })
  assert.equal(allowed.calls, 1)
  assert.ok(!readFileSync('components/avatar/interactive-avatar.tsx','utf8').includes('NEXT_PUBLIC_OPENAI_API_KEY'))
})

test('unsupported and oversized audio are rejected before provider calls', async () => {
  const denied = transcription('alice')
  const unsupported = await denied.POST(new Request('https://example.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }))
  assert.equal(unsupported.status, 415)
  const large = await denied.POST(new Request('https://example.com', { method: 'POST', headers: { 'content-type': 'audio/webm' }, body: new Uint8Array(2 * 1024 * 1024 + 1) }))
  assert.equal(large.status, 413)
  assert.equal(denied.calls, 0)
})
