/** Server-side billing core. Not exposed as an HTTP endpoint until webhook sync is ready. */
export function testBillingConfig(env: Record<string, string | undefined>) {
  if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
    throw new Error('Stripe test configuration required')
  }
  if (!env.STRIPE_TEST_PRICE_ID?.startsWith('price_')) {
    throw new Error('Stripe test price required')
  }
  const origin = new URL(env.BILLING_APP_ORIGIN || '')
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
    (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && origin.hostname === 'localhost'))) {
    throw new Error('Invalid billing origin')
  }
  return { secretKey: env.STRIPE_SECRET_KEY, priceId: env.STRIPE_TEST_PRICE_ID, origin: origin.origin }
}

type CheckoutClient = {
  prices: { retrieve(id: string): Promise<{ id: string; active: boolean; livemode: boolean; recurring: unknown }> }
  checkout: { sessions: { create(params: Record<string, unknown>, options: { idempotencyKey: string }): Promise<{ url: string | null }> } }
}
export async function createTestCheckout(
  client: CheckoutClient,
  config: ReturnType<typeof testBillingConfig>,
  // Identity and customer must come from the authenticated session and server mapping.
  account: { userId: string; customerId: string; subscriptionExists: boolean } | null,
  attemptId: string
) {
  if (!account?.userId || !account.customerId.startsWith('cus_')) throw new Error('Unauthorized')
  if (account.subscriptionExists) throw new Error('Existing subscription requires customer portal')
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(attemptId)) throw new Error('Invalid checkout attempt')
  const price = await client.prices.retrieve(config.priceId)
  if (price.id !== config.priceId || !price.active || price.livemode || !price.recurring) {
    throw new Error('Active recurring test price required')
  }
  return client.checkout.sessions.create({
    mode: 'subscription', customer: account.customerId,
    client_reference_id: account.userId,
    line_items: [{ price: config.priceId, quantity: 1 }],
    subscription_data: { metadata: { userId: account.userId } },
    success_url: `${config.origin}/billing?checkout=returned`,
    cancel_url: `${config.origin}/billing?checkout=cancelled`
  }, { idempotencyKey: `innoflex-checkout:${account.userId}:${attemptId}` })
}
