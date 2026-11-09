import { verificationKey, sendgridHandler } from '@/lib/email/events'
import { emailEnvironment, recordDelivery } from '@/lib/email/store'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const environment = emailEnvironment()
    const key =
      process.env.SENDGRID_EVENTS_ENABLED === 'true'
        ? verificationKey(process.env.SENDGRID_EVENT_PUBLIC_KEY)
        : null
    return sendgridHandler(key, environment, event =>
      recordDelivery(environment, event)
    )(request)
  } catch {
    return new Response('Webhook unavailable', { status: 503 })
  }
}
