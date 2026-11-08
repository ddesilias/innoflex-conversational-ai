export function safeStripeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      ['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname) ? url.href : null
  } catch { return null }
}
