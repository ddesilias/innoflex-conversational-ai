'use server'
import { after } from 'next/server'
import { issuePasswordReset, resetPassword } from '@/lib/accounts/reset-store'
import {
  recoveryMailConfig,
  sendRecoveryLink,
  sendPasswordChanged
} from '@/lib/accounts/sendgrid'
import {
  requestRecovery,
  finishRecovery,
  type RecoveryResult,
  type RecoveryService
} from '@/lib/accounts/recovery-service'

const service: RecoveryService = {
  config: recoveryMailConfig,
  schedule: work => after(work),
  issue: issuePasswordReset,
  reset: resetPassword,
  sendLink: sendRecoveryLink,
  sendChanged: sendPasswordChanged,
  record: code => console.warn('INNOFLEX_RECOVERY', { code })
}
export async function requestPasswordReset(
  previous: RecoveryResult | undefined,
  form: FormData
) {
  return requestRecovery(service, form.get('email'))
}
export async function confirmPasswordReset(
  previous: RecoveryResult | undefined,
  form: FormData
) {
  return finishRecovery(
    service,
    form.get('token'),
    form.get('password'),
    form.get('confirmation')
  )
}
