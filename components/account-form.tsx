'use client'

import { useFormStatus } from 'react-dom'
import { signup } from '@/app/signup/actions'
import { authenticate } from '@/app/login/actions'
import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeSlash,
  LockKey
} from '@phosphor-icons/react'
import { IconSpinner } from './ui/icons'
import { getMessageFromCode } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import styles from './account-form.module.css'

export default function AccountForm({
  mode = 'login',
  returnTo = '/'
}: {
  mode?: 'login' | 'signup'
  returnTo?: '/' | '/trading-journal' | '/messages'
}) {
  const router = useRouter()
  const [result, dispatch] = useActionState(
    mode === 'signup' ? signup : authenticate,
    undefined
  )
  useEffect(() => {
    if (result && result.type !== 'error') {
      toast.success(getMessageFromCode(result.resultCode))
      router.replace(returnTo)
      router.refresh()
    }
  }, [result, router, returnTo])

  return (
    <div className={styles.panel}>
      <Link href="/presentation" className={styles.back}>
        <ArrowLeft size={15} /> Retour au produit
      </Link>
      <div className={styles.formHeading}>
        <span className={styles.eyebrow}>VOTRE ESPACE PERSONNEL</span>
        <h1>
          {mode === 'signup' ? 'Votre espace commence ici.' : 'Bon retour.'}
        </h1>
        <p>
          {mode === 'signup'
            ? 'Créez votre compte pour commencer votre journal. Accès pilote gratuit, sans carte bancaire.'
            : returnTo === '/messages'
              ? 'Connectez-vous pour retrouver vos échanges privés.'
              : returnTo === '/trading-journal'
                ? 'Retrouvez vos analyses, vos opérations et votre dernier cycle de trading.'
                : 'Connectez-vous à votre espace Trading & Investissement.'}
        </p>
      </div>
      <form action={dispatch}>
        <AccountFields
          signupMode={mode === 'signup'}
          error={
            result?.type === 'error'
              ? getMessageFromCode(result.resultCode)
              : undefined
          }
        />
      </form>
      <p className={styles.signup}>
        {mode === 'signup'
          ? 'Vous avez déjà un compte ?'
          : 'Vous découvrez INNOFLEX ?'}
        <Link
          href={`${mode === 'signup' ? '/login' : '/signup'}${returnTo !== '/' ? `?next=${returnTo}` : ''}`}
        >
          {mode === 'signup' ? 'Se connecter' : 'Créer un compte'}{' '}
          <ArrowRight size={13} />
        </Link>
      </p>
      <div className={styles.privacy}>
        <LockKey size={16} />
        <p>
          Votre journal reste dans votre compte. Les échanges privés et les
          conversations IA sont dans des espaces distincts.
        </p>
      </div>
      <div className={styles.support}>
        Un problème de connexion ?{' '}
        <a href="mailto:dimitry.d@innoflexequipe.com">Contactez-nous</a>
      </div>
    </div>
  )
}

function AccountFields({
  error,
  signupMode
}: {
  error?: string
  signupMode: boolean
}) {
  const { pending } = useFormStatus()
  const [visible, setVisible] = useState(false)
  return (
    <fieldset disabled={pending} aria-busy={pending} className={styles.fields}>
      <label htmlFor="email">Adresse e-mail</label>
      <input
        id="email"
        type="email"
        name="email"
        placeholder="vous@exemple.com"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
        required
        aria-describedby={error ? 'login-error' : undefined}
      />
      <div className={styles.passwordLabel}>
        <label htmlFor="password">Mot de passe</label>
        {!signupMode ? (
          <Link href="/forgot-password">Mot de passe oublié ?</Link>
        ) : null}
      </div>
      <div className={styles.passwordInput}>
        <input
          id="password"
          type={visible ? 'text' : 'password'}
          name="password"
          placeholder={
            signupMode ? 'Au moins 12 caractères' : 'Votre mot de passe'
          }
          autoComplete={signupMode ? 'new-password' : 'current-password'}
          maxLength={256}
          required
          minLength={signupMode ? 12 : 6}
          aria-describedby={error ? 'login-error' : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible(value => !value)}
          aria-label={
            visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
          }
          aria-pressed={visible}
        >
          {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
        </button>
      </div>
      {signupMode ? (
        <p className={styles.fieldHint}>
          Utilisez au moins 12 caractères. Évitez de réutiliser un mot de passe
          d’un autre service.
        </p>
      ) : null}
      {error && !pending ? (
        <p id="login-error" role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className={styles.submit}
        disabled={pending}
        aria-disabled={pending}
      >
        {pending ? (
          <>
            <IconSpinner />{' '}
            {signupMode ? 'Création en cours…' : 'Connexion en cours…'}
          </>
        ) : (
          <>
            {signupMode ? 'Créer mon espace' : 'Se connecter'}{' '}
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </fieldset>
  )
}
