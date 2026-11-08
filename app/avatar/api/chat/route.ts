import { configuredModel } from '@/lib/ai/config';
import { reserveUsage } from '@/lib/security/usage';
import { QuotaError } from '@/lib/security/quota';
import { z } from 'zod';
import { auth } from '@/auth';
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  
  let messages;
  try {
    const text = await req.text();
    if (text.length > 32000) return new Response('Request too large', { status: 413 });
    messages = z.object({ messages: z.array(z.object({
      role: z.enum(['user', 'assistant']), content: z.string().min(1).max(8000)
    })).min(1).max(40) }).parse(JSON.parse(text)).messages;
  } catch { return new Response('Invalid messages', { status: 400 }); }
  let model: string;
  try { model = configuredModel(process.env.OPENAI_CHAT_MODEL); }
  catch { return new Response('Chat unavailable', { status: 503 }); }
  try { await reserveUsage(session.user.id, 'ai'); }
  catch (error) {
    const status = error instanceof QuotaError ? error.status : 503;
    return new Response(status === 429 ? 'Daily usage limit reached' : 'Usage control unavailable', {
      status, headers: error instanceof QuotaError && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}
    });
  }

  const result = await streamText({
    model: openai(model),
    messages,
    maxOutputTokens: 1024,
  });

  return result.toTextStreamResponse();
}
