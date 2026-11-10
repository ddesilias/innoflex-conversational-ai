import { auth } from '@/auth'
import AccountForm from '@/components/account-form'
import { AuthShell } from '@/components/auth-shell'
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
    <AuthShell label="Connexion à INNOFLEX">
      <AccountForm mode="login" returnTo={returnTo} />
    </AuthShell>
  )
}
