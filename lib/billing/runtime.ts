import Stripe from 'stripe'
import { testBillingConfig } from './checkout'

// No client or network call during import/build; billing stays off until explicitly configured.
export function testBillingRuntime() {
  if (process.env.BILLING_TEST_ENABLED !== 'true') throw new Error('Billing disabled')
  const config = testBillingConfig(process.env)
  const signingSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signingSecret?.startsWith('whsec_')) throw new Error('Webhook configuration required')
  const stripe = new Stripe(config.secretKey, { maxNetworkRetries: 1, timeout: 10_000 })
  return {
    stripe, config, signingSecret,
    async verifyAccount() {
      const account = await stripe.accounts.retrieveCurrent()
      if (account.id !== 'acct_1PvL4SKQ6tQikNSX') throw new Error('Unexpected Stripe account')
    }
  }
}
