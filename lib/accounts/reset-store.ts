import 'server-only'
import { kv } from '@vercel/kv'
import { hashPassword } from './password'
import { consumeAuthAttempt } from './attempts'
import {
  preparePasswordReset,
  completePasswordReset,
  type ResetDependencies
} from './reset'

const dependencies: ResetDependencies = {
  evaluate: (script, keys, args) => kv.eval(script, keys, args),
  readAccount: email => kv.hgetall(`user:${email}`),
  readReset: key => kv.hgetall(key),
  limit: (identity, kind) =>
    consumeAuthAttempt(
      (script, keys, args) => kv.eval(script, keys, args),
      identity,
      kind
    ),
  hash: hashPassword
}
// Internal operations; public entry points are gated by recovery configuration.
export const issuePasswordReset = (email: string) =>
  preparePasswordReset(dependencies, email)
export async function resetPassword(
  token: string,
  password: string,
  confirmation: string
) {
  let email: string | null = null
  const changed = await completePasswordReset(
    {
      ...dependencies,
      readReset: async key => {
        const record = await dependencies.readReset(key)
        email = record?.email || null
        return record
      }
    },
    token,
    password,
    confirmation
  )
  return { changed, email: changed ? email : null }
}
