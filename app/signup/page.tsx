import { auth } from '@/auth'
import SignupForm from '@/components/signup-form'
import { Session } from '@/lib/types'
import { redirect } from 'next/navigation'
import { loginReturnPath } from '@/lib/accounts/return-path'

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string | string[] }>
}) {
  const returnTo = loginReturnPath((await searchParams).next)
  const session = (await auth()) as Session

  if (session) {
    redirect(returnTo)
  }

  return (
    <main className="flex items-center justify-center min-h-screen w-full">
      <SignupForm returnTo={returnTo} />
    </main>
  )
}
