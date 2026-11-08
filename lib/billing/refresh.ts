import type Stripe from 'stripe'
import { reconcileKnownSubscription, type BillingSnapshot, type BillingStore } from './reconcile'

export async function refreshTestSnapshot(
  stripe: Pick<Stripe, 'subscriptions'>, store: BillingStore,
  read: () => Promise<BillingSnapshot | null>,
  userId: string, customerId: string | null, priceId: string, now = Date.now()
) {
  const snapshot = await read()
  if (snapshot && (snapshot.userId !== userId || snapshot.customerId !== customerId)) throw new Error('Billing ownership mismatch')
  // Refresh before the 15-minute access window expires.
  if (snapshot && snapshot.checkedAt <= now && now - snapshot.checkedAt < 10 * 60_000) return snapshot
  if (!customerId) return null
  const binding = await store.binding(customerId)
  if (!binding || binding.userId !== userId) throw new Error('Billing binding mismatch')
  if (!binding.subscriptionId) return null // Initial subscription is established by a verified webhook.
  await reconcileKnownSubscription(stripe, store, priceId, binding.subscriptionId, customerId,
    `refresh:${crypto.randomUUID()}`)
  return read()
}
