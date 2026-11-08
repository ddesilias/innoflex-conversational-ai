import { auth } from '@/auth'
import { testBillingRuntime } from '@/lib/billing/runtime'
import { createTestPortal } from '@/lib/billing/portal'
import { testCustomerStore } from '@/lib/billing/customer-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
  try {
    const context = testBillingRuntime()
    if (request.headers.get('origin') !== context.config.origin) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers })
    }
    await context.verifyAccount()
    const url = await createTestPortal(context.stripe, testCustomerStore, session.user.id, context.config.origin)
    return Response.json({ url, mode: 'test' }, { headers })
  } catch {
    return Response.json({ error: 'Billing portal unavailable' }, { status: 503, headers })
  }
}
