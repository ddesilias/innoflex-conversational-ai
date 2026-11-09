import 'server-only'
import { accountNamespace } from './keys'

export interface RecoveryMailConfig {
  apiKey: string
  from: string
  origin: string
}
const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
export function recoveryMailConfig(
  env: NodeJS.ProcessEnv = process.env
): RecoveryMailConfig {
  accountNamespace(env)
  if (env.PASSWORD_RESET_ENABLED !== 'true') throw Error('Recovery unavailable')
  const apiKey = env.SENDGRID_API_KEY || ''
  const from = env.SENDGRID_FROM_EMAIL || ''
  const origin = new URL(env.PASSWORD_RESET_ORIGIN || '')
  const local =
    env.NODE_ENV === 'development' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname)
  if (
    !/^SG\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(apiKey) ||
    apiKey.length > 256 ||
    !emailPattern.test(from) ||
    from.length > 254 ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    !(origin.protocol === 'https:' || (local && origin.protocol === 'http:'))
  )
    throw Error('Recovery unavailable')
  return { apiKey, from, origin: origin.origin }
}
export function recoveryAvailable() {
  try {
    recoveryMailConfig()
    return true
  } catch {
    return false
  }
}
async function send(
  config: RecoveryMailConfig,
  email: string,
  subject: string,
  text: string,
  fetcher: typeof fetch
) {
  if (!emailPattern.test(email) || email.length > 254)
    throw Error('Invalid recipient')
  try {
    const response = await fetcher('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        custom_args: {
          innoflex_product: 'innoflex-conversational-ai',
          innoflex_environment:
            process.env.VERCEL_ENV === 'preview'
              ? 'preview'
              : process.env.VERCEL_ENV === 'production'
                ? 'production'
                : 'local'
        },
        from: { email: config.from, name: 'INNOFLEX Trading & Investissement' },
        subject,
        content: [{ type: 'text/plain', value: text }],
        tracking_settings: {
          click_tracking: { enable: false, enable_text: false },
          open_tracking: { enable: false },
          subscription_tracking: { enable: false }
        }
      })
    })
    await response.body?.cancel()
    if (response.status !== 202) throw Error('Rejected')
  } catch {
    throw Error('Recovery email unavailable')
  }
}
export async function sendRecoveryLink(
  config: RecoveryMailConfig,
  email: string,
  token: string,
  fetcher: typeof fetch = fetch
) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw Error('Invalid token')
  const link = new URL('/reset-password', config.origin)
  link.hash = new URLSearchParams({ token }).toString()
  await send(
    config,
    email,
    'Réinitialisez votre mot de passe INNOFLEX',
    `Bonjour,\n\nUne réinitialisation de votre mot de passe INNOFLEX a été demandée. Ce lien est valable 15 minutes et ne peut être utilisé qu’une fois :\n\n${link.href}\n\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message. Votre mot de passe reste inchangé.\n\nINNOFLEX`,
    fetcher
  )
}
export async function sendPasswordChanged(
  config: RecoveryMailConfig,
  email: string,
  fetcher: typeof fetch = fetch
) {
  await send(
    config,
    email,
    'Votre mot de passe INNOFLEX a été modifié',
    'Bonjour,\n\nVotre mot de passe INNOFLEX vient d’être modifié. Les anciennes sessions et les liens de récupération précédents sont invalidés.\n\nSi vous n’êtes pas à l’origine de ce changement, demandez un nouveau lien depuis la page de connexion INNOFLEX.\n\nINNOFLEX',
    fetcher
  )
}
