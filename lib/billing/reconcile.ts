import type Stripe from 'stripe'

export interface BillingSnapshot {
  userId: string
  customerId: string
  subscriptionId: string
  status: string
  paid: boolean
  checkedAt: number
  validUntil: number
}
export interface BillingStore {
  processed(eventId: string): Promise<boolean>
  lock(customerId: string, token: string): Promise<boolean>
  unlock(customerId: string, token: string): Promise<void>
  binding(customerId: string): Promise<{ userId: string; subscriptionId?: string } | null>
  commit(eventId: string, token: string, snapshot: BillingSnapshot): Promise<void>
}

// Read the subscription again after acquiring the lock; never trust an old event's status.
export function subscriptionReconciler(
  stripe: Pick<Stripe, 'subscriptions'>,
  store: BillingStore,
  priceId: string,
  now: () => number = Date.now,
  token: () => string = () => crypto.randomUUID()
) {
  return async (event: Stripe.Event) => {
    if (event.livemode || event.account) throw new Error('Unexpected Stripe scope')
    if (await store.processed(event.id)) return
    const object = event.data.object as Stripe.Subscription
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id
    if (!customerId || !object.id?.startsWith('sub_')) throw new Error('Invalid subscription event')
    await reconcileKnownSubscription(stripe, store, priceId, object.id, customerId, event.id, now, token)
  }
}

// Shared by verified webhooks and authenticated on-demand refreshes.
export async function reconcileKnownSubscription(
  stripe: Pick<Stripe, 'subscriptions'>, store: BillingStore, priceId: string,
  subscriptionId: string, customerId: string, eventId: string,
  now: () => number = Date.now, token: () => string = () => crypto.randomUUID()
) {
    const lockToken = token()
    if (!await store.lock(customerId, lockToken)) throw new Error('Reconciliation busy')
    try {
      if (await store.processed(eventId)) return
      const binding = await store.binding(customerId)
      if (!binding?.userId || (binding.subscriptionId && binding.subscriptionId !== subscriptionId)) throw new Error('Subscription binding missing')
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const actualCustomer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      if (subscription.livemode || actualCustomer !== customerId) throw new Error('Subscription scope mismatch')
      const items = subscription.items.data.filter(item => item.price.id === priceId)
      if (!binding.subscriptionId && (subscription.metadata.userId !== binding.userId || items.length !== 1)) {
        throw new Error('Initial subscription binding mismatch')
      }
      const checkedAt = now()
      const end = items.length === 1 ? items[0].current_period_end * 1000 : 0
      const validUntil = Math.min(end, subscription.cancel_at ? subscription.cancel_at * 1000 : end)
      const paid = subscription.status === 'active' && !subscription.pause_collection && validUntil > checkedAt
      await store.commit(eventId, lockToken, {
        userId: binding.userId, customerId, subscriptionId: subscription.id,
        status: subscription.status, paid: !!paid, checkedAt, validUntil
      })
    } finally {
      await store.unlock(customerId, lockToken)
    }
}


// A stale mirror fails closed; production needs scheduled refresh/reconciliation.
export function hasPaidAccess(snapshot: BillingSnapshot | null, userId: string, now = Date.now()) {
  return !!snapshot && snapshot.userId === userId && snapshot.paid && snapshot.status === 'active' &&
    snapshot.validUntil > now && snapshot.checkedAt <= now && now - snapshot.checkedAt < 15 * 60_000
}
