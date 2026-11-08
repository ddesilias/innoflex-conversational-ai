import type Stripe from 'stripe'
import { ensureTestCustomer, type CustomerStore } from './customer'
import { createTestCheckout, type testBillingConfig } from './checkout'

export interface CheckoutIntentStore {
  intent(user: string, price: string, now: number): Promise<{ id: string; priceId: string; createdAt: number }>
}
export async function startTestCheckout(
  stripe: Stripe, customers: CustomerStore, attempts: CheckoutIntentStore,
  config: ReturnType<typeof testBillingConfig>, userId: string, now = Date.now()
) {
  const customerId = await ensureTestCustomer(stripe, customers, userId, now)
  const intent = await attempts.intent(userId, config.priceId, now)
  if (intent.priceId !== config.priceId || intent.createdAt > now || now - intent.createdAt >= 23 * 60 * 60_000) {
    throw new Error('Checkout attempt requires reconciliation')
  }
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 })
  // Any outstanding subscription prevents another checkout, including incomplete/unpaid ones.
  const subscriptionExists = subscriptions.has_more || subscriptions.data.some(s => !['canceled', 'incomplete_expired'].includes(s.status))
  return createTestCheckout({ prices: stripe.prices, checkout: { sessions: {
    create: (params, options) => stripe.checkout.sessions.create(params as Stripe.Checkout.SessionCreateParams, options)
  } } }, config, { userId, customerId, subscriptionExists }, intent.id)
}
