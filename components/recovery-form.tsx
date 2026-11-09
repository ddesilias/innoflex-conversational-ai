'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import {
  requestPasswordReset,
  confirmPasswordReset
} from '@/app/forgot-password/actions'

const messages = {
  accepted:
    'Si un compte correspond à cette adresse, un lien de récupération pourra vous être envoyé. Consultez aussi vos messages indésirables.',
  changed:
    'Votre mot de passe est modifié. Reconnectez-vous avec votre nouveau mot de passe.',
  unavailable:
    'La récupération de compte est momentanément indisponible. Réessayez plus tard.',
  invalid:
    'Vérifiez les informations saisies. Le lien peut aussi être invalide, expiré ou déjà utilisé.',
  retry: 'L’opération n’a pas pu être terminée. Patientez puis réessayez.'
}
function Submit({ disabled, reset }: { disabled: boolean; reset: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-md bg-primary p-3 font-medium text-primary-foreground disabled:opacity-50"
    >
      {pending
        ? 'Traitement…'
        : reset
          ? 'Modifier mon mot de passe'
          : 'Demander un lien'}
    </button>
  )
}
export function RecoveryForm({
  reset = false,
  available
}: {
  reset?: boolean
  available: boolean
}) {
  const [token, setToken] = useState('')
  const tokenRead = useRef(false)
  const [state, dispatch] = useActionState(
    reset ? confirmPasswordReset : requestPasswordReset,
    undefined
  )
  useEffect(() => {
    if (!reset || tokenRead.current) return
    tokenRead.current = true
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get('token') || ''
    setToken(/^[a-f0-9]{64}$/.test(value) ? value : '')
    window.history.replaceState(null, '', window.location.pathname)
  }, [reset])
  const finished = state?.code === 'changed' || state?.code === 'accepted'
  const inputClass = 'w-full rounded-md border bg-background px-3 py-2'
  return (
    <section className="mx-auto my-12 w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
      <p className="mb-2 text-sm text-muted-foreground">
        INNOFLEX · Votre compte
      </p>
      <h1 className="mb-3 text-2xl font-semibold">
        {reset ? 'Choisissez un nouveau mot de passe' : 'Mot de passe oublié ?'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {reset
          ? 'Utilisez au moins 12 caractères. Vos anciennes sessions seront invalidées.'
          : 'Indiquez l’adresse utilisée pour votre compte INNOFLEX.'}
      </p>
      {!available ? (
        <p role="status" className="mb-4 rounded-md border p-3">
          La récupération de compte n’est pas encore disponible. Le service
          d’envoi doit être configuré.
        </p>
      ) : null}
      {reset && available && !token && !finished ? (
        <p role="status" className="mb-4 rounded-md border p-3">
          Ouvrez le lien reçu par e-mail pour continuer. Sans lien valide,
          demandez-en un nouveau.
        </p>
      ) : null}
      {!finished ? (
        <form action={dispatch} className="space-y-4">
          {reset ? (
            <>
              <input type="hidden" name="token" value={token} />
              <label className="block space-y-2">
                <span>Nouveau mot de passe</span>
                <input
                  className={inputClass}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={256}
                  disabled={!available || !token}
                />
              </label>
              <label className="block space-y-2">
                <span>Confirmer le mot de passe</span>
                <input
                  className={inputClass}
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={256}
                  disabled={!available || !token}
                />
              </label>
            </>
          ) : (
            <label className="block space-y-2">
              <span>Adresse e-mail</span>
              <input
                className={inputClass}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                disabled={!available}
              />
            </label>
          )}
          <Submit disabled={!available || (reset && !token)} reset={reset} />
        </form>
      ) : null}
      {state ? (
        <p role="status" className="mt-4 rounded-md border p-3 text-sm">
          {messages[state.code]}
        </p>
      ) : null}
      <nav className="mt-6 flex flex-wrap gap-4 text-sm underline">
        <Link href="/login">Retour à la connexion</Link>
        {reset ? (
          <Link href="/forgot-password">Demander un nouveau lien</Link>
        ) : null}
      </nav>
    </section>
  )
}
