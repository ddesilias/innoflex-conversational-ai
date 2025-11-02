// lib/coingecko.ts
import { z } from 'zod'

const CoinSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  image: z.string().url(),
  current_price: z.number(),
  market_cap: z.number(),
  market_cap_rank: z.number().optional(),
  total_volume: z.number().optional()
})

const CoinsListSchema = z.array(CoinSchema)

export const SupportedCurrenciesList = async () => {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/supported_vs_currencies'
  )
  return response.json()
}

export default async function CoinsListWithMarketData(currency: string) {
    const supportedCurrencies = await SupportedCurrenciesList()
    currency = supportedCurrencies.find((c: string) => c === currency)
  if (!currency) {
    throw new Error('Currency not supported')
  }
 try {
   const response = await fetch(
     `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}`,
     {
       method: 'GET',
       headers: {
         'x-cg-demo-api-key': process.env.NEXT_PUBLIC_X_CG_DEMO_API_KEY || '',
         Accept: 'application/json'
       }
     }
   )

   if (!response.ok) {
     if (response.status === 429) {
       throw new Error('Limite de requêtes dépassée. Réessayez plus tard.')
     }
     throw new Error(`Erreur ${response.status} : ${response.statusText}`)
   }

   const data = await response.json()

   const validatedData = CoinsListSchema.parse(data)
   return validatedData
 } catch (error) {
   if (error instanceof z.ZodError) {
     console.error('Erreur de validation :', error.errors)
   } else {
     console.error('Erreur de requête API :', error)
   }
   throw new Error(
     'Échec de la récupération ou de la validation des données CoinGecko'
   )
 }
}

