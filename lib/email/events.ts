import {
  createHash,
  createPublicKey,
  verify,
  type KeyObject
} from 'node:crypto'
import { readLimitedBody } from '@/lib/security/read-body'
export const eventTypes = [
  'processed',
  'delivered',
  'deferred',
  'dropped',
  'bounce',
  'blocked',
  'spamreport'
] as const
export function verificationKey(value: string | undefined) {
  if (!value || value.length > 2048) throw Error('Webhook unavailable')
  const key = value.includes('BEGIN PUBLIC KEY')
    ? createPublicKey(value)
    : createPublicKey({
        key: Buffer.from(value, 'base64'),
        format: 'der',
        type: 'spki'
      })
  if (
    key.asymmetricKeyType !== 'ec' ||
    key.asymmetricKeyDetails?.namedCurve !== 'prime256v1'
  )
    throw Error('Invalid verification key')
  return key
}
export function validSignature(
  key: KeyObject,
  raw: Uint8Array,
  signature: string | null,
  timestamp: string | null,
  now = Date.now()
) {
  if (
    !signature ||
    signature.length > 160 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(signature) ||
    !timestamp ||
    !/^\d{10}$/.test(timestamp)
  )
    return false
  const age = Math.floor(now / 1000) - Number(timestamp)
  if (age < -300 || age > 72 * 3600) return false
  try {
    return verify(
      'sha256',
      Buffer.concat([Buffer.from(timestamp), Buffer.from(raw)]),
      key,
      Buffer.from(signature, 'base64')
    )
  } catch {
    return false
  }
}
export type DeliveryEvent = {
  id: string
  type: (typeof eventTypes)[number]
  timestamp: number
}
export function deliveryEvents(
  raw: Uint8Array,
  environment: string,
  now = Date.now()
): DeliveryEvent[] {
  const rows = JSON.parse(Buffer.from(raw).toString('utf8'))
  if (!Array.isArray(rows) || rows.length > 100 || rows.length === 0)
    throw Error('Invalid events')
  const result: DeliveryEvent[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') throw Error('Invalid event')
    if (
      row.innoflex_product !== 'innoflex-conversational-ai' ||
      row.innoflex_environment !== environment
    )
      continue
    const type =
      row.event === 'bounce' && row.type === 'blocked' ? 'blocked' : row.event
    if (!eventTypes.includes(type)) continue
    if (
      typeof row.sg_event_id !== 'string' ||
      !row.sg_event_id ||
      row.sg_event_id.length > 300 ||
      !Number.isInteger(row.timestamp)
    )
      throw Error('Invalid event')
    if (
      row.timestamp > Math.floor(now / 1000) + 300 ||
      row.timestamp < Math.floor(now / 1000) - 7 * 86400
    )
      continue
    result.push({
      id: createHash('sha256').update(row.sg_event_id).digest('hex'),
      type,
      timestamp: row.timestamp
    })
  }
  return result
}
export const recordDeliveryScript = `
if redis.call('EXISTS',KEYS[1]) == 1 then return 0 end
local counterType=redis.call('TYPE',KEYS[2]).ok
local lastType=redis.call('TYPE',KEYS[3]).ok
if (counterType ~= 'none' and counterType ~= 'hash') or (lastType ~= 'none' and lastType ~= 'string') then return redis.error_reply('Invalid counters') end
local count=redis.call('HGET',KEYS[2],ARGV[1])
if count and (not string.match(count,'^%d+$') or tonumber(count) >= 1000000000000) then return redis.error_reply('Invalid counter') end
local previous=redis.call('GET',KEYS[3])
if previous and not tonumber(previous) then return redis.error_reply('Invalid timestamp') end
redis.call('HINCRBY',KEYS[2],ARGV[1],1)
redis.call('EXPIRE',KEYS[2],2592000)
if tonumber(ARGV[2]) > (tonumber(previous) or 0) then redis.call('SET',KEYS[3],ARGV[2],'EX',2592000) end
redis.call('SET',KEYS[1],'1','EX',2678400)
return 1
`
export function sendgridHandler(
  key: KeyObject | null,
  environment: string,
  save: (event: DeliveryEvent) => Promise<void>
) {
  return async (request: Request) => {
    if (!key) return new Response('Webhook unavailable', { status: 503 })
    let raw: Uint8Array
    try {
      raw = await readLimitedBody(request, 128 * 1024)
    } catch {
      return new Response('Invalid body', { status: 413 })
    }
    if (
      !validSignature(
        key,
        raw,
        request.headers.get('x-twilio-email-event-webhook-signature'),
        request.headers.get('x-twilio-email-event-webhook-timestamp')
      )
    )
      return new Response('Invalid signature', { status: 401 })
    let events: DeliveryEvent[]
    try {
      events = deliveryEvents(raw, environment)
    } catch {
      return new Response('Invalid events', { status: 400 })
    }
    try {
      for (const event of events) await save(event)
    } catch {
      return new Response('Storage unavailable', { status: 503 })
    }
    return new Response(null, { status: 204 })
  }
}
