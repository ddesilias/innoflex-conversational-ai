import 'server-only'
import { kv } from '@vercel/kv'
import { recordDeliveryScript, eventTypes, type DeliveryEvent } from './events'
export function emailEnvironment() {
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  if (process.env.VERCEL_ENV === 'production') return 'production'
  if (process.env.NODE_ENV === 'development') return 'local'
  throw Error('Unknown mail environment')
}
export const dayKey = (environment: string, day: number) =>
  `email-events:innoflex-conversational-ai:${environment}:day:${day}`
const lastKey = (environment: string) =>
  `email-events:innoflex-conversational-ai:${environment}:last`
export async function recordDelivery(
  environment: string,
  event: DeliveryEvent
) {
  const result = await kv.eval(
    recordDeliveryScript,
    [
      `email-events:${environment}:seen:${event.id}`,
      dayKey(environment, Math.floor(event.timestamp / 86400)),
      lastKey(environment)
    ],
    [event.type, event.timestamp]
  )
  if (![0, 1].includes(Number(result)) || result === null)
    throw Error('Event persistence unavailable')
}
export async function emailSummary(environment: string) {
  const day = Math.floor(Date.now() / 86400000)
  const [counts, last] = await Promise.all([
    kv.hgetall<Record<string, number>>(dayKey(environment, day)),
    kv.get<number>(lastKey(environment))
  ])
  return {
    environment,
    day: new Date(day * 86400000).toISOString().slice(0, 10),
    observedAt: new Date().toISOString(),
    lastEventAt: last ? new Date(Number(last) * 1000).toISOString() : null,
    counts: counts
      ? Object.fromEntries(
          eventTypes.map(type => [type, Number(counts[type] || 0)])
        )
      : null
  }
}
