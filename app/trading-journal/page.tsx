import type { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import TradingWorkbench from '@/components/trading-workbench'
export const metadata: Metadata = {
  title: { absolute: 'INNOFLEX Trading & Investissement — Journal de trading' }
}
export default async function TradingJournalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/trading-journal')
  return <TradingWorkbench />
}
