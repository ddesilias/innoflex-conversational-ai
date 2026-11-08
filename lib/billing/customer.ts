import type Stripe from 'stripe'

export interface CustomerStore {
  customer(userId: string): Promise<string | null>
  // Must durably create once or return the existing intent before any Stripe write.
  intent(userId: string, now: number): Promise<{ id: string; createdAt: number }>
  bind(userId: string, customerId: string): Promise<void>
}

export async function ensureTestCustomer(
  stripe: Pick<Stripe, 'customers'>,
  store: CustomerStore,
  userId: string,
  now = Date.now()
) {
  if (!userId) throw new Error('Unauthorized')
  const existing = await store.customer(userId)
  if (existing) return existing
  const intent = await store.intent(userId, now)
  // Stripe can prune idempotency keys after 24h. Never retry an uncertain creation after that window.
  if (intent.createdAt > now || now - intent.createdAt >= 23 * 60 * 60_000) {
    throw new Error('Customer creation requires reconciliation')
  }
  const customer = await stripe.customers.create({ metadata: { userId, service: 'innoflex-conversational-ai' } },
    { idempotencyKey: `innoflex-customer:${intent.id}` })
  if (customer.livemode || customer.metadata.userId !== userId) throw new Error('Unexpected customer scope')
  await store.bind(userId, customer.id)
  return customer.id
}
