import type { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import TradingWorkbench from '@/components/trading-workbench'
import { listTradingCycles, loadTradingDraft } from './actions'
export const metadata: Metadata = {
  title: { absolute: 'INNOFLEX Trading & Investissement — Journal de trading' }
}
export default async function TradingJournalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/trading-journal')
  const listing = await listTradingCycles()
  const cycles = listing.ok ? listing.cycles : []
  const id = cycles[0]?.id || 'default'
  const saved = listing.ok ? await loadTradingDraft(id) : null
  return (
    <TradingWorkbench
      initial={{
        cycles,
        id,
        draft: saved?.ok ? saved.draft : null,
        revision: saved?.ok ? saved.revision : 0,
        message: !listing.ok
          ? listing.message
          : saved && !saved.ok
            ? saved.message
            : saved?.ok && saved.draft
              ? 'Dernier cycle sauvegardé chargé. Vos modifications restent à enregistrer avant de quitter.'
              : 'Bienvenue dans votre journal. Préparez votre premier cycle, puis enregistrez-le sur votre compte.'
      }}
    />
  )
}
