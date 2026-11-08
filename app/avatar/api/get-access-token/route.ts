import { reserveUsage } from '@/lib/security/usage';
import { QuotaError } from '@/lib/security/quota';
import { auth } from '@/auth';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  try { await reserveUsage(session.user.id, 'avatar'); }
  catch (error) {
    const status = error instanceof QuotaError ? error.status : 503;
    return new Response(status === 429 ? 'Daily usage limit reached' : 'Usage control unavailable', {
      status, headers: error instanceof QuotaError && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}
    });
  }
  try {
    if (!HEYGEN_API_KEY) {
      throw new Error("API key is missing from .env");
    }

    const res = await fetch(
      "https://api.heygen.com/v1/streaming.create_token",
      {
        method: "POST",
        headers: {
          "x-api-key": HEYGEN_API_KEY,
        },
      }
    );
    const data = await res.json();

    return new Response(data.data.token, {
      status: 200,
    });
  } catch (error) {
    console.error("Avatar token request failed");

    return new Response("Failed to retrieve access token", {
      status: 500,
    });
  }
}
