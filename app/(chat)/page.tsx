import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { ProductLanding } from '@/components/product-landing'
import { AI } from '@/lib/chat/actions'
import { auth } from '@/auth'
import { Session } from '@/lib/types'
import { getMissingKeys } from '@/app/actions'

export const metadata = {
  title: { absolute: 'INNOFLEX Trading & Investissement — Journal et revue de trading' }
}

export default async function IndexPage() {
  const id = nanoid()
  const session = (await auth()) as Session
  if (!session?.user) return <ProductLanding />
  const missingKeys = await getMissingKeys()
  return (
    <>
      <AI initialAIState={{ chatId: id, messages: [] }}>
        <Chat id={id} session={session} missingKeys={missingKeys} />
      </AI>
    </>
  )
}
