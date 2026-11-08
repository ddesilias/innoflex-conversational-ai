import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Authentification
  // const authResponse = await auth()

  // // Si la requête est refusée par le middleware d'authentification, retourner la réponse immédiatement
  // if (authResponse) {
  //   return authResponse
  // }

  // Gérer les requêtes OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  // Créer une réponse pour les en-têtes CORS
  const response = NextResponse.next()

  // Ajouter les en-têtes CORS
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  )
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  )

  return response
}
// Read more: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}

export const runtime = 'experimental-edge'
