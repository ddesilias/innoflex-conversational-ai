import { auth } from '@/auth'
import { testBillingRuntime } from '@/lib/billing/runtime'
import { startTestCheckout } from '@/lib/billing/start-checkout'
import { testCustomerStore } from '@/lib/billing/customer-store'
import { testCheckoutStore } from '@/lib/billing/checkout-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
  try {
    const context = testBillingRuntime()
    // Prices, customer, user and URLs are never taken from the request body.
    if (request.headers.get('origin') !== context.config.origin) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers })
    }
    await context.verifyAccount()
    const checkout = await startTestCheckout(context.stripe, testCustomerStore, testCheckoutStore, context.config, session.user.id)
    if (!checkout.url) throw new Error('Checkout unavailable')
    return Response.json({ url: checkout.url, mode: 'test' }, { headers })
  } catch {
    return Response.json({ error: 'Checkout unavailable' }, { status: 503, headers })
  }
}
