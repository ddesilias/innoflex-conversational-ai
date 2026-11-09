const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  ts = require('typescript'),
  vm = require('node:vm')
const api = {}
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('lib/trading/review.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText,
  { exports: api }
)
test('empty cycle has unknown result, never fabricated zero', () => {
  const r = api.reviewTrades([])
  assert.equal(r.netCents, null)
  assert.equal(r.winRate, null)
})
test('open, unknown and nonfinite results are excluded; flat results remain resolved', () => {
  const r = api.reviewTrades([
    { status: 'Ouverte', pnl: 99999 },
    { status: 'Clôturée', pnl: null },
    { status: 'Clôturée', pnl: NaN },
    { status: 'Clôturée', pnl: 2500 },
    { status: 'Clôturée', pnl: -1000 },
    { status: 'Clôturée', pnl: 0 }
  ])
  assert.equal(r.closed, 3)
  assert.equal(r.open, 1)
  assert.equal(r.incomplete, 2)
  assert.equal(r.netCents, 1500)
  assert.equal(r.winRate, 1 / 3)
  assert.equal(r.flat, 1)
})
test('money uses integer cents, accepts French decimals and rejects ambiguous amounts', () => {
  assert.equal(api.parseMoney('12,34'), 1234)
  assert.equal(api.parseMoney('-0.05'), -5)
  assert.equal(api.parseMoney('0'), 0)
  for (const v of ['', 'NaN', '1e3', '12.345', '1,000.00'])
    assert.equal(api.parseMoney(v), null)
})

test('imports preserve a valid cycle and reject mixed modes, duplicate ids and malformed results', () => {
  const draft = {
    version: 1,
    cycle: 'Test',
    mode: 'Backtest',
    currency: 'CAD',
    plan: { method: '', limits: '', avoid: '' },
    trades: [
      {
        id: '1',
        date: '2026-11-08',
        asset: 'TEST',
        mode: 'Backtest',
        status: 'Clôturée',
        pnl: 0,
        lesson: ''
      }
    ]
  }
  assert.equal(api.parseCycleDraft(JSON.stringify(draft)).trades[0].pnl, 0)
  for (const patch of [
    { mode: 'Réel' },
    { date: '2026-02-30' },
    { pnl: 0.5 },
    { status: 'Ouverte', pnl: 100 }
  ])
    assert.throws(() =>
      api.parseCycleDraft(
        JSON.stringify({ ...draft, trades: [{ ...draft.trades[0], ...patch }] })
      )
    )
  assert.throws(() =>
    api.parseCycleDraft(
      JSON.stringify({ ...draft, trades: [draft.trades[0], draft.trades[0]] })
    )
  )
  assert.throws(() => api.parseCycleDraft('{broken'))
})
test('weekly review includes seven calendar days across a year boundary', () => {
  const rows = ['2026-12-28', '2027-01-03', '2027-01-04'].map(date => ({
    date
  }))
  assert.equal(api.filterReviewWeek(rows, '2026-12-28').length, 2)
  assert.equal(api.filterReviewWeek(rows, '').length, 3)
  assert.equal(api.filterReviewWeek(rows, '2026-02-30').length, 0)
})
