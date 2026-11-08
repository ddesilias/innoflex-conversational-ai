import { auth } from '@/auth'
import { configuredModel } from '@/lib/ai/config'
import { readLimitedBody } from '@/lib/security/read-body'
import { reserveUsage } from '@/lib/security/usage'
import { QuotaError } from '@/lib/security/quota'
import { openai } from '@ai-sdk/openai'
import { transcribe } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 30
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
  const mime = request.headers.get('content-type')?.split(';')[0]
  if (!['audio/webm','audio/wav','audio/mp4','audio/ogg','audio/mpeg'].includes(mime || '')) {
    return new Response('Unsupported audio format', { status: 415 })
  }
  let audio: Uint8Array
  try { audio = await readLimitedBody(request, 2 * 1024 * 1024) }
  catch { return new Response('Invalid or oversized audio', { status: 413 }) }
  let model: string
  try { model = configuredModel(process.env.OPENAI_TRANSCRIPTION_MODEL) }
  catch { return new Response('Transcription unavailable', { status: 503 }) }
  try { await reserveUsage(session.user.id, 'ai') }
  catch (error) {
    const status = error instanceof QuotaError ? error.status : 503
    return new Response('Usage limit or service unavailable', {
      status, headers: error instanceof QuotaError && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}
    })
  }
  try {
    const result = await transcribe({ model: openai.transcription(model), audio, abortSignal: request.signal, maxRetries: 0 })
    return Response.json({ text: result.text }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return new Response('Transcription unavailable', { status: 502 }) }
}
