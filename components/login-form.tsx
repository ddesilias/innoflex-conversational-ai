'use client'

import { useFormStatus } from 'react-dom'
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
import styles from './login-form.module.css'

export default function LoginForm({
  returnTo = '/'
}: {
  returnTo?: '/' | '/trading-journal' | '/messages'
}) {
  const router = useRouter()
  const [result, dispatch] = useActionState(authenticate, undefined)
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
        <h1>Bon retour.</h1>
        <p>
          {returnTo === '/messages'
            ? 'Connectez-vous pour retrouver vos échanges privés.'
            : returnTo === '/trading-journal'
              ? 'Retrouvez vos analyses, vos opérations et votre dernier cycle de trading.'
              : 'Connectez-vous à votre espace Trading & Investissement.'}
        </p>
      </div>
      <form action={dispatch}>
        <LoginFields
          error={
            result?.type === 'error'
              ? getMessageFromCode(result.resultCode)
              : undefined
          }
        />
      </form>
      <p className={styles.signup}>
        Vous découvrez INNOFLEX ?{' '}
        <Link href={returnTo !== '/' ? `/signup?next=${returnTo}` : '/signup'}>
          Créer un compte <ArrowRight size={13} />
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

function LoginFields({ error }: { error?: string }) {
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
        <Link href="/forgot-password">Mot de passe oublié ?</Link>
      </div>
      <div className={styles.passwordInput}>
        <input
          id="password"
          type={visible ? 'text' : 'password'}
          name="password"
          placeholder="Votre mot de passe"
          autoComplete="current-password"
          maxLength={256}
          required
          minLength={6}
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
            <IconSpinner /> Connexion en cours…
          </>
        ) : (
          <>
            Se connecter <ArrowRight size={18} />
          </>
        )}
      </button>
    </fieldset>
  )
}
