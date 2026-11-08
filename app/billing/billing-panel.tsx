'use client'

import { useEffect, useRef, useState } from 'react'
import { safeStripeRedirect } from '@/lib/billing/redirect'

type BillingStatus = { mode: 'test'; paidAccess: boolean; hasCustomer: boolean; hasSubscription: boolean; sync: string }
export default function BillingPanel() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [message, setMessage] = useState('Chargement du statut…')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)

  async function refresh(signal?: AbortSignal) {
    try {
      const response = await fetch('/api/billing/status', { cache: 'no-store', signal })
      if (response.status === 401) { setStatus(null); setMessage('Reconnectez-vous pour consulter la facturation.'); return }
      if (!response.ok) throw new Error('unavailable')
      const value = await response.json()
      if (value.mode !== 'test' || typeof value.paidAccess !== 'boolean' || typeof value.hasCustomer !== 'boolean' || typeof value.hasSubscription !== 'boolean') throw new Error('invalid')
      setStatus(value)
      setMessage(value.paidAccess ? 'Abonnement de test vérifié.' : value.sync === 'refresh-required'
        ? 'Statut en attente de synchronisation. Aucun droit payant n’est confirmé.'
        : 'Aucun droit payant confirmé pour ce compte.')
    } catch {
      if (signal?.aborted) return
      setStatus(null)
      setMessage('La facturation de test est indisponible pour le moment. Aucun paiement ne peut être lancé ici.')
    }
  }
  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [])

  async function open(action: 'checkout' | 'portal') {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true)
    try {
      const response = await fetch(`/api/billing/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (!response.ok) throw new Error('unavailable')
      const value = await response.json()
      const url = value.mode === 'test' ? safeStripeRedirect(value.url) : null
      if (!url) throw new Error('invalid')
      window.location.assign(url)
    } catch {
      setMessage('Impossible d’ouvrir Stripe. Aucun abonnement n’est confirmé ici ; vérifiez votre statut avant une nouvelle tentative.')
    } finally { inFlight.current = false; setBusy(false) }
  }
  return (
    <div className="space-y-5 rounded-lg border bg-background p-6" aria-busy={busy}>
      <p role="status" aria-live="polite">{message}</p>
      <p className="text-sm text-muted-foreground">Le retour de Stripe ne suffit pas à confirmer l’abonnement. Le statut doit être synchronisé.</p>
      <div className="flex flex-wrap gap-4">
        <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy || !status || status.hasSubscription} onClick={() => void open('checkout')}>Essayer l’abonnement de test</button>
        <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy || !status?.hasCustomer} onClick={() => void open('portal')}>Gérer dans Stripe</button>
        <button className="rounded border px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => void refresh()}>Actualiser le statut</button>
      </div>
    </div>
  )
}
