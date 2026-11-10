const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
const React = require('react')
const { renderToString } = require('react-dom/server')
function load(file, mocks = {}) {
  const api = {}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, {
    exports: api, require: name => name.endsWith('.css') ? {} : name in mocks ? mocks[name] : require(name)
  })
  return api
}
test('market SVG title renders as one text node without hydration comment separators', () => {
  const { MarketPreview } = load('components/market-preview.tsx', { 'next/link': { __esModule: true, default: ({ children }) => React.createElement('a', null, children) } })
  const html = renderToString(React.createElement(MarketPreview))
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/)[1]
  assert.ok(title.includes('EUR / USD'))
  assert.ok(title.includes('1 h'))
  assert.ok(!title.includes('<'), 'SVG title must contain only plain text')
})
test('performance SVG title also renders without hydration separators', () => {
  const { TradingPerformance } = load('components/trading-performance.tsx', { '@/lib/trading/review': { realizedSeries: () => [{ date: '2026-11-09', cents: 12500 }] } })
  const html = renderToString(React.createElement(TradingPerformance, { trades: [], currency: 'CAD' }))
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/)[1]
  assert.ok(title.includes('125'))
  assert.ok(!title.includes('<'), 'SVG title must contain only plain text')
})
