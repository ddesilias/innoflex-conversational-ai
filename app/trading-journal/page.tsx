import type { Metadata } from 'next'
import TradingWorkbench from '@/components/trading-workbench'
export const metadata: Metadata = { title: 'INNOFLEX SI — Atelier G20' }
export default function TradingJournalPage() {
  return <TradingWorkbench />
}
