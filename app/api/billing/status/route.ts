import { refreshTestSnapshot } from '@/lib/billing/refresh'
import { testBillingStore } from '@/lib/billing/store'
import { auth } from '@/auth'
import { kv } from '@vercel/kv'
import { testBillingRuntime } from '@/lib/billing/runtime'
import { hasPaidAccess, type BillingSnapshot } from '@/lib/billing/reconcile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
  const userId = session.user.id
  try {
    const context = testBillingRuntime()
    await context.verifyAccount()
    const customer = await kv.get<string>(`billing:test:customer:${userId}`)
    const snapshot = await refreshTestSnapshot(context.stripe, testBillingStore, async () =>
      kv.get<BillingSnapshot>(`billing:test:subscription:${userId}`),
      userId, customer, context.config.priceId)
    const fresh = !!snapshot && snapshot.checkedAt <= Date.now() && Date.now() - snapshot.checkedAt < 15 * 60_000
    return Response.json({ mode: 'test', paidAccess: hasPaidAccess(snapshot, userId),
      hasCustomer: !!customer, hasSubscription: !!snapshot,
      sync: fresh ? 'observed' : customer ? 'refresh-required' : 'not-started' }, { headers })
  } catch {
    return Response.json({ error: 'Billing unavailable' }, { status: 503, headers })
  }
}
