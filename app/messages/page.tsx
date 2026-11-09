import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { PrivateMessages } from '@/components/private-messages'
export const metadata = { title: 'Messages privés' }
export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?next=/messages')
  return <PrivateMessages />
}
