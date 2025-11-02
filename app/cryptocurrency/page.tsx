import { Suspense } from 'react'
import CoinsListWithMarketData from '@/lib/coin-gecko-api/coin-gecko-api'
import { columns, CoinSchema } from './columns'
import { DataTable } from './data-table'

const CryptocurrencyPage = async () => {
  let coins: CoinSchema[] = []
  let error = null

  try {
    coins = await CoinsListWithMarketData('usd')
  } catch (e) {
    console.error('Error fetching cryptocurrency data:', e)
    error = 'Failed to fetch cryptocurrency data. Please try again later.'
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-5">Top Cryptocurrencies</h1>
      {error ? (
        <div className="text-red-500">{error}</div>
      ) : (
        <Suspense fallback={<div>Loading...</div>}>
          <DataTable columns={columns} data={coins} />
        </Suspense>
      )}
    </div>
  )
}

export default CryptocurrencyPage
