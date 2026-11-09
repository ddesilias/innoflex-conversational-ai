import Link from 'next/link'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import BillingPanel from './billing-panel'

export const metadata = { title: { absolute: 'Facturation | INNOFLEX Trading & Investissement' } }
export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 px-6 py-12" lang="fr">
      <Link href="/" className="underline">Retour à l’assistant</Link>
      <h1 className="text-3xl font-bold">Facturation INNOFLEX</h1>
      <p>Environnement de test. Les souscriptions proposées ici ne déclenchent aucun paiement réel.</p>
      <BillingPanel />
    </section>
  )
}
