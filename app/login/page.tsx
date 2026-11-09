import { auth } from '@/auth'
import LoginForm from '@/components/login-form'
import { Session } from '@/lib/types'
import { redirect } from 'next/navigation'
import { loginReturnPath } from '@/lib/accounts/return-path'

export default async function LoginPage({
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
      <LoginForm returnTo={returnTo} />
    </main>
  )
}
