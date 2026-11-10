import { AuthShell } from '@/components/auth-shell'
import { RecoveryForm } from '@/components/recovery-form'
import { recoveryAvailable } from '@/lib/accounts/sendgrid'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
export const metadata = {
  title: 'Nouveau mot de passe',
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
}
export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <RecoveryForm reset available={recoveryAvailable()} />
    </AuthShell>
  )
}
