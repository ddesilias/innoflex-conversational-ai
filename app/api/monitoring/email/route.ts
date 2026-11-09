import { timingSafeEqual } from 'node:crypto'
import { emailEnvironment, emailSummary } from '@/lib/email/store'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const secret = process.env.EMAIL_MONITORING_TOKEN
  const header = request.headers.get('authorization') || ''
  if (
    !secret ||
    secret.length < 32 ||
    Buffer.byteLength(header) !== Buffer.byteLength('Bearer ' + secret) ||
    !timingSafeEqual(Buffer.from(header), Buffer.from('Bearer ' + secret))
  )
    return new Response('Unauthorized', { status: 401 })
  try {
    if (
      process.env.SENDGRID_EVENTS_ENABLED !== 'true' ||
      !process.env.SENDGRID_EVENT_PUBLIC_KEY
    )
      return Response.json(
        { environment: emailEnvironment(), configured: false, counts: null },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    return Response.json(
      { configured: true, ...(await emailSummary(emailEnvironment())) },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return new Response('Monitoring unavailable', { status: 503 })
  }
}
