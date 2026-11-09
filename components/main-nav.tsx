'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLockup } from './brand-lockup'
import styles from './main-nav.module.css'

export default function MainNav({
  signedIn = false,
  account,
  chatControls
}: {
  signedIn?: boolean
  account?: ReactNode
  chatControls?: ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const inAssistant =
    signedIn && (pathname === '/' || pathname.startsWith('/chat/'))
  const links = [
    {
      title: 'Le produit',
      href: '/presentation',
      active: pathname === '/presentation' || (!signedIn && pathname === '/')
    },
    {
      title: 'Journal',
      href: '/trading-journal',
      active: pathname === '/trading-journal'
    },
    ...(signedIn
      ? [{ title: 'Assistant', href: '/', active: inAssistant }]
      : [])
  ]
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          href="/presentation"
          className={styles.brand}
          aria-label="INNOFLEX SI — Présentation"
        >
          <BrandLockup />
        </Link>
        {inAssistant ? (
          <div className={styles.chatControls}>{chatControls}</div>
        ) : null}
        <nav
          id="site-navigation"
          aria-label="Navigation principale"
          className={styles.navigation}
          data-open={open}
        >
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {link.title}
            </Link>
          ))}
          {!signedIn ? (
            <Link
              className={styles.mobileLogin}
              href="/login?next=/trading-journal"
              onClick={() => setOpen(false)}
            >
              Connexion
            </Link>
          ) : null}
        </nav>
        <div className={styles.account}>
          {signedIn ? (
            account
          ) : (
            <Link className={styles.login} href="/login?next=/trading-journal">
              Connexion
            </Link>
          )}
        </div>
        <button
          className={styles.menuButton}
          type="button"
          aria-expanded={open}
          aria-controls="site-navigation"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen(value => !value)}
        >
          <span aria-hidden="true">{open ? '×' : '☰'}</span>
          <span>Menu</span>
        </button>
      </div>
    </header>
  )
}
