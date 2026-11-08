import { testBillingRuntime } from '@/lib/billing/runtime'
import { testWebhookHandler } from '@/lib/billing/webhook'
import { subscriptionReconciler } from '@/lib/billing/reconcile'
import { testBillingStore } from '@/lib/billing/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const context = testBillingRuntime()
    const reconcile = subscriptionReconciler(context.stripe, testBillingStore, context.config.priceId)
    // The signature is verified before any Stripe account/subscription API request.
    return await testWebhookHandler(context.stripe, context.signingSecret, async event => {
      await context.verifyAccount()
      await reconcile(event)
    })(request)
  } catch {
    return new Response('Billing unavailable', { status: 503 })
  }
}
