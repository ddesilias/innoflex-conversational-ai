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
  try {
    const context = testBillingRuntime()
    await context.verifyAccount()
    const snapshot = await kv.get<BillingSnapshot>(`billing:test:subscription:${session.user.id}`)
    const fresh = !!snapshot && snapshot.checkedAt <= Date.now() && Date.now() - snapshot.checkedAt < 15 * 60_000
    return Response.json({ mode: 'test', paidAccess: hasPaidAccess(snapshot, session.user.id),
      sync: fresh ? 'observed' : 'refresh-required' }, { headers })
  } catch {
    return Response.json({ error: 'Billing unavailable' }, { status: 503, headers })
  }
}
