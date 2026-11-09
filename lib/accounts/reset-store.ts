import 'server-only'
import { kv } from '@vercel/kv'
import { hashPassword } from './password'
import { consumeAuthAttempt } from './attempts'
import { preparePasswordReset, completePasswordReset, type ResetDependencies } from './reset'

const dependencies: ResetDependencies = {
  evaluate: (script, keys, args) => kv.eval(script, keys, args),
  readAccount: email => kv.hgetall(`user:${email}`),
  readReset: key => kv.hgetall(key),
  limit: (identity, kind) => consumeAuthAttempt((script, keys, args) => kv.eval(script, keys, args), identity, kind),
  hash: hashPassword
}
// Not server actions: deliberately not exposed until email delivery is approved.
export const issuePasswordReset = (email: string) => preparePasswordReset(dependencies, email)
export const resetPassword = (token: string, password: string, confirmation: string) => completePasswordReset(dependencies, token, password, confirmation)
