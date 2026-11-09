export type Trade = {
  id: string
  date: string
  asset: string
  mode: 'Backtest' | 'Réel'
  status: 'Ouverte' | 'Clôturée'
  pnl: number | null
  lesson: string
  direction?: '' | 'Long' | 'Short'
  setup?: string
  emotionBefore?: string
  emotionAfter?: string
  planFollowed?: '' | 'Oui' | 'Non'
}
// The caller supplies one cycle, one mode and one currency. Missing results
// remain unknown; open positions never contribute to realized results.
export function reviewTrades(trades: Trade[]) {
  const closed = trades.filter(
    t =>
      t.status === 'Clôturée' && t.pnl !== null && Number.isSafeInteger(t.pnl)
  )
  const wins = closed.filter(t => t.pnl! > 0).length
  const losses = closed.filter(t => t.pnl! < 0).length
  return {
    open: trades.filter(t => t.status === 'Ouverte').length,
    incomplete: trades.filter(
      t =>
        t.status === 'Clôturée' &&
        (t.pnl === null || !Number.isSafeInteger(t.pnl))
    ).length,
    closed: closed.length,
    wins,
    losses,
    flat: closed.length - wins - losses,
    planDocumented: trades.filter(
      t => t.planFollowed === 'Oui' || t.planFollowed === 'Non'
    ).length,
    planDeviations: trades.filter(t => t.planFollowed === 'Non').length,
    netCents: closed.length ? closed.reduce((sum, t) => sum + t.pnl!, 0) : null,
    winRate: closed.length ? wins / closed.length : null
  }
}
export function parseMoney(value: string): number | null {
  if (!/^-?\d{1,9}(?:[.,]\d{1,2})?$/.test(value.trim())) return null
  const [whole, fraction = ''] = value
    .trim()
    .replace(',', '.')
    .replace('-', '')
    .split('.')
  return (
    (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) *
    (value.trim().startsWith('-') ? -1 : 1)
  )
}

export type CycleDraft = {
  version: 1
  cycle: string
  mode: Trade['mode']
  currency: 'CAD' | 'USD' | 'EUR'
  plan: { method: string; limits: string; avoid: string }
  trades: Trade[]
}
export function validTradeDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(value + 'T00:00:00Z')
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}
export function parseCycleDraft(text: string): CycleDraft {
  const fail = () => {
    throw new Error(
      'Fichier G20 invalide ou incompatible. Aucun changement effectué.'
    )
  }
  if (text.length > 2_000_000) return fail()
  const data = JSON.parse(text)
  const string = (value: unknown, max: number): value is string =>
    typeof value === 'string' && value.length <= max
  if (
    !data ||
    data.version !== 1 ||
    !string(data.cycle, 100) ||
    !['Réel', 'Backtest'].includes(data.mode) ||
    !['CAD', 'USD', 'EUR'].includes(data.currency) ||
    !data.plan ||
    !['method', 'limits', 'avoid'].every(key => string(data.plan[key], 4000)) ||
    !Array.isArray(data.trades) ||
    data.trades.length > 5000
  )
    return fail()
  const ids = new Set<string>()
  const trades: Trade[] = data.trades.map((t: Trade) => {
    if (
      !t ||
      !string(t.id, 100) ||
      !t.id ||
      ids.has(t.id) ||
      !validTradeDate(t.date) ||
      !string(t.asset, 60) ||
      !t.asset.trim() ||
      t.mode !== data.mode ||
      !['Ouverte', 'Clôturée'].includes(t.status) ||
      !string(t.lesson, 4000) ||
      !(
        t.pnl === null ||
        (Number.isSafeInteger(t.pnl) && Math.abs(t.pnl) <= 99_999_999_999)
      ) ||
      (t.status === 'Ouverte' && t.pnl !== null)
    )
      return fail()
    if (
      (t.direction !== undefined &&
        !['', 'Long', 'Short'].includes(t.direction)) ||
      (t.planFollowed !== undefined &&
        !['', 'Oui', 'Non'].includes(t.planFollowed)) ||
      (t.setup !== undefined && !string(t.setup, 1000)) ||
      (t.emotionBefore !== undefined && !string(t.emotionBefore, 100)) ||
      (t.emotionAfter !== undefined && !string(t.emotionAfter, 100))
    )
      return fail()
    ids.add(t.id)
    return {
      id: t.id,
      date: t.date,
      asset: t.asset,
      mode: t.mode,
      status: t.status,
      pnl: t.pnl,
      lesson: t.lesson,
      ...(t.direction !== undefined ? { direction: t.direction } : {}),
      ...(t.setup !== undefined ? { setup: t.setup } : {}),
      ...(t.emotionBefore !== undefined
        ? { emotionBefore: t.emotionBefore }
        : {}),
      ...(t.emotionAfter !== undefined ? { emotionAfter: t.emotionAfter } : {}),
      ...(t.planFollowed !== undefined ? { planFollowed: t.planFollowed } : {})
    }
  })
  return {
    version: 1,
    cycle: data.cycle,
    mode: data.mode,
    currency: data.currency,
    plan: {
      method: data.plan.method,
      limits: data.plan.limits,
      avoid: data.plan.avoid
    },
    trades
  }
}
export function filterReviewWeek(trades: Trade[], start: string): Trade[] {
  if (!start) return trades
  if (!validTradeDate(start)) return []
  const end = new Date(start + 'T00:00:00Z')
  end.setUTCDate(end.getUTCDate() + 6)
  const last = end.toISOString().slice(0, 10)
  return trades.filter(t => t.date >= start && t.date <= last)
}
