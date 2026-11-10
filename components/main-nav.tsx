'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowUpRight,
  CaretDown,
  ChartLine,
  ChatCircle,
  Compass,
  List,
  Notebook,
  Sparkle,
  UserCircle,
  X
} from '@phosphor-icons/react'
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
  const productActive =
    pathname === '/presentation' || (!signedIn && pathname === '/')
  const tools = [
    {
      title: 'Découvrir INNOFLEX',
      description: 'Le produit et ses usages',
      href: '/presentation',
      icon: Compass,
      active: productActive
    },
    {
      title: 'Journal de trading',
      description: 'Préparer, consigner et revoir',
      href: '/trading-journal',
      icon: Notebook,
      active: pathname === '/trading-journal'
    },
    {
      title: 'Messages privés',
      description: 'Échanger à deux, sur invitation',
      href: '/messages',
      icon: ChatCircle,
      active: pathname === '/messages'
    },
    {
      title: 'Assistant IA',
      description: 'Un espace de conversation distinct',
      href: signedIn ? '/' : '/login',
      icon: Sparkle,
      active: inAssistant
    }
  ]
  const links = [
    {
      title: 'Journal',
      href: '/trading-journal',
      active: pathname === '/trading-journal'
    },
    ...(signedIn
      ? [
          {
            title: 'Messages',
            href: '/messages',
            active: pathname === '/messages'
          },
          { title: 'Assistant IA', href: '/', active: inAssistant }
        ]
      : [
          {
            title: 'Démonstration',
            href: '/presentation#apercu',
            active: false
          },
          { title: 'À propos', href: '/presentation#confiance', active: false }
        ])
  ]
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          href="/presentation"
          className={styles.brand}
          aria-label="INNOFLEX Trading & Investissement — Présentation"
        >
          <BrandLockup compact />
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
          <details
            className={styles.products}
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.currentTarget.open = false
                e.currentTarget.querySelector('summary')?.focus()
              }
            }}
          >
            <summary data-active={productActive}>
              Produits <CaretDown size={12} weight="bold" />
            </summary>
            <div className={styles.productMenu}>
              <p>VOTRE ESPACE DE TRADING</p>
              {tools.map(tool => (
                <Link
                  key={tool.title}
                  href={tool.href}
                  aria-current={tool.active ? 'page' : undefined}
                  onClick={e => {
                    e.currentTarget.closest('details')?.removeAttribute('open')
                    setOpen(false)
                  }}
                >
                  <span className={styles.toolIcon}>
                    <tool.icon size={20} />
                  </span>
                  <span>
                    <strong>{tool.title}</strong>
                    <small>{tool.description}</small>
                  </span>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
              <div className={styles.menuFootnote}>
                <span /> Accès pilote · aucun paiement demandé
              </div>
            </div>
          </details>
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
              <UserCircle size={19} /> Connexion
            </Link>
          ) : null}
        </nav>
        <div className={styles.account}>
          <span
            className={styles.language}
            lang="fr"
            aria-label="Langue du site : français"
          >
            FR
          </span>
          {signedIn ? (
            account
          ) : (
            <>
              <Link
                className={styles.login}
                href="/login?next=/trading-journal"
              >
                <UserCircle size={22} />
                <span>Connexion</span>
              </Link>
              <Link
                className={styles.start}
                href="/signup?next=/trading-journal"
              >
                Commencer <ArrowUpRight size={15} weight="bold" />
              </Link>
            </>
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
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </div>
    </header>
  )
}
