import type { RecoveryMailConfig } from './sendgrid'
export type RecoveryResult = {
  code: 'accepted' | 'changed' | 'unavailable' | 'invalid' | 'retry'
}
export interface RecoveryService {
  config: () => RecoveryMailConfig
  schedule: (work: () => Promise<void>) => void
  issue: (email: string) => Promise<{ email: string; token: string } | null>
  reset: (
    token: string,
    password: string,
    confirmation: string
  ) => Promise<{ changed: boolean; email: string | null }>
  sendLink: (
    config: RecoveryMailConfig,
    email: string,
    token: string
  ) => Promise<void>
  sendChanged: (config: RecoveryMailConfig, email: string) => Promise<void>
  record: (code: 'request_failed' | 'notification_failed') => void
}
export async function requestRecovery(
  deps: RecoveryService,
  email: unknown
): Promise<RecoveryResult> {
  let config: RecoveryMailConfig
  try {
    config = deps.config()
  } catch {
    return { code: 'unavailable' }
  }
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
  )
    return { code: 'invalid' }
  try {
    // Identity lookup and email delivery happen after the same public response.
    deps.schedule(async () => {
      try {
        const recovery = await deps.issue(email)
        if (recovery)
          await deps.sendLink(config, recovery.email, recovery.token)
      } catch {
        deps.record('request_failed')
      }
    })
    return { code: 'accepted' }
  } catch {
    return { code: 'unavailable' }
  }
}
export async function finishRecovery(
  deps: RecoveryService,
  token: unknown,
  password: unknown,
  confirmation: unknown
): Promise<RecoveryResult> {
  let config: RecoveryMailConfig
  try {
    config = deps.config()
  } catch {
    return { code: 'unavailable' }
  }
  if (
    typeof token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(token) ||
    typeof password !== 'string' ||
    password.length < 12 ||
    password.length > 256 ||
    password !== confirmation
  )
    return { code: 'invalid' }
  let result: { changed: boolean; email: string | null }
  try {
    result = await deps.reset(token, password, password)
  } catch {
    return { code: 'retry' }
  }
  if (!result.changed) return { code: 'invalid' }
  // An email failure must never report that an already committed reset failed.
  try {
    deps.schedule(async () => {
      try {
        if (result.email) await deps.sendChanged(config, result.email)
      } catch {
        deps.record('notification_failed')
      }
    })
  } catch {
    deps.record('notification_failed')
  }
  return { code: 'changed' }
}
