import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { auth } from '@/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  IconGitHub,
  IconNextChat,
  IconSeparator,
  IconVercel
} from '@/components/ui/icons'
import { UserMenu } from '@/components/user-menu'
import { SidebarMobile } from './sidebar-mobile'
import { SidebarToggle } from './sidebar-toggle'
import { ChatHistory } from './chat-history'
import { Session } from '@/lib/types'
import MainNav from './main-nav'
function UserOrLogin({ session }: { session: Session | null }) {
  if (!session?.user)
    return (
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex w-full max-w-[1144px] items-center justify-between gap-4"
      >
        <Link
          href="/"
          aria-label="INNOFLEX — Accueil"
          className="flex items-center gap-3 text-[#193d36]"
        >
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg bg-[#193d36] text-lg font-semibold tracking-tighter text-white"
          >
            if<span className="text-[#bbd0a9]">.</span>
          </span>
          <span className="text-xl font-semibold tracking-tight">
            innoflex
            <span className="mt-0.5 block text-[8px] font-medium tracking-[0.18em]">
              CONVERSATIONAL AI
            </span>
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-xs text-[#52666d] md:flex">
          <Link href="/#usages">Les usages</Link>
          <Link href="/#fonctionnement">Comment ça marche</Link>
          <Link href="/#confiance">Transparence</Link>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/login"
            className="font-medium text-[#193d36] hover:underline"
          >
            Connexion
          </Link>
          <Link
            href="/signup"
            className="hidden rounded-md border border-[#193d36] px-4 py-2 font-medium text-[#193d36] hover:bg-[#edf1e8] sm:block"
          >
            Créer un compte ↗
          </Link>
        </div>
      </nav>
    )
  return (
    <>
      {session?.user ? (
        <>
          <SidebarMobile>
            <ChatHistory userId={session.user.id} />
          </SidebarMobile>
          <SidebarToggle />
        </>
      ) : (
        <Link href="/new" rel="nofollow">
          <IconNextChat className="size-6 mr-2 dark:hidden" inverted />
          <IconNextChat className="hidden size-6 mr-2 dark:block" />
        </Link>
      )}
      <div className="flex items-center">
        <IconSeparator className="size-6 text-muted-foreground/50" />
        {session?.user ? (
          <>
            <UserMenu user={session.user} />
            <MainNav />
          </>
        ) : (
          <Button variant="link" asChild className="-ml-2">
            <Link href="/login">Login</Link>
          </Button>
        )}
      </div>
    </>
  )
}

export async function Header() {
  const session = (await auth()) as Session | null
  return (
    <header
      className={cn(
        'sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b px-4',
        session?.user ? 'bg-background' : 'border-[#e1e6dc] bg-[#fafbf8]'
      )}
    >
      <div className="flex w-full items-center">
        <React.Suspense fallback={<div className="flex-1 overflow-auto" />}>
          <UserOrLogin session={session} />
        </React.Suspense>
      </div>
    </header>
  )
}
