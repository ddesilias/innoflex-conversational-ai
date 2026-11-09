import type { Metadata } from 'next'
import TradingWorkbench from '@/components/trading-workbench'
export const metadata: Metadata = {
  title: { absolute: 'INNOFLEX SI — Journal de trading' }
}
export default function TradingJournalPage() {
  return <TradingWorkbench />
}
