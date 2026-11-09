// The legacy production keys remain readable. Local and Preview use isolated
// namespaces even when Vercel's Redis integration supplies the same database.
export function accountNamespace(env: NodeJS.ProcessEnv = process.env) {
  if (env.VERCEL_ENV === 'production') {
    if (env.ACCOUNT_STORAGE_NAMESPACE) throw Error('Production account namespace must remain legacy')
    return ''
  }
  const namespace = env.ACCOUNT_STORAGE_NAMESPACE || (env.VERCEL_ENV === 'preview' ? '' : env.NODE_ENV === 'development' ? 'local' : '')
  if (env.VERCEL_ENV === 'preview' && !namespace) throw Error('Preview account namespace required')
  if (namespace && (!/^[a-z][a-z0-9-]{0,31}$/.test(namespace) || namespace === 'production')) throw Error('Invalid account namespace')
  return namespace
}
export function accountStorageKey(email: string, env: NodeJS.ProcessEnv = process.env) {
  const namespace = accountNamespace(env)
  return `${namespace ? `account-env:${namespace}:` : ''}user:${email}`
}
export function resetStorageKey(digest: string, env: NodeJS.ProcessEnv = process.env) {
  const namespace = accountNamespace(env)
  return `${namespace ? `account-env:${namespace}:` : ''}password-reset:${digest}`
}
