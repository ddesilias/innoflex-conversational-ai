import Stripe from 'stripe'

const subscriptionEvents = new Set([
  'customer.subscription.created', 'customer.subscription.updated',
  'customer.subscription.deleted', 'customer.subscription.paused',
  'customer.subscription.resumed'
])

/** Integrate only with a reconciler that persists event IDs atomically and is safe to retry. */
export function testWebhookHandler(
  stripe: Stripe,
  signingSecret: string,
  reconcile: (event: Stripe.Event) => Promise<void>
) {
  if (!signingSecret.startsWith('whsec_')) throw new Error('Webhook signing secret required')
  return async (request: Request): Promise<Response> => {
    const signature = request.headers.get('stripe-signature')
    if (!signature) return new Response('Invalid signature', { status: 400 })
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(await request.text(), signature, signingSecret)
    } catch {
      return new Response('Invalid signature', { status: 400 })
    }
    // Connected accounts are outside this pilot's scope; production events are refused.
    if (event.livemode || event.account) return new Response('Unexpected event scope', { status: 400 })
    if (!subscriptionEvents.has(event.type)) return new Response(null, { status: 204 })
    try {
      // Never acknowledge before durable reconciliation has completed.
      await reconcile(event)
      return new Response(null, { status: 204 })
    } catch {
      // Stripe retries failures. Do not log payloads or disclose internal errors.
      return new Response('Reconciliation unavailable', { status: 503 })
    }
  }
}
