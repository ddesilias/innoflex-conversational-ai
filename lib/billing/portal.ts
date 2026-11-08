import type Stripe from 'stripe'
import type { CustomerStore } from './customer'

export async function createTestPortal(
  stripe: Pick<Stripe, 'customers' | 'billingPortal'>,
  store: Pick<CustomerStore, 'customer'>,
  userId: string,
  origin: string
) {
  if (!userId) throw new Error('Unauthorized')
  const customerId = await store.customer(userId)
  if (!customerId) throw new Error('Customer not found')
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted || customer.livemode || customer.metadata.userId !== userId) {
    throw new Error('Unexpected customer scope')
  }
  const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/billing` })
  if (session.livemode) throw new Error('Unexpected portal mode')
  return session.url
}
