import { auth } from '@/auth'
import { UserMenu } from '@/components/user-menu'
import { SidebarMobile } from './sidebar-mobile'
import { SidebarToggle } from './sidebar-toggle'
import { ChatHistory } from './chat-history'
import { type Session } from '@/lib/types'
import MainNav from './main-nav'

export async function Header() {
  const session = (await auth()) as Session | null
  return (
    <MainNav
      signedIn={Boolean(session?.user)}
      account={session?.user ? <UserMenu user={session.user} /> : null}
      chatControls={
        session?.user ? (
          <>
            <SidebarMobile>
              <ChatHistory userId={session.user.id} />
            </SidebarMobile>
            <SidebarToggle />
          </>
        ) : null
      }
    />
  )
}
