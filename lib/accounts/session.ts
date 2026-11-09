export function credentialVersion(value: unknown): number | null {
  if (value === undefined) return 0 // Accounts and sessions created before versioning.
  if (typeof value === 'string' && /^\d{1,9}$/.test(value)) value = Number(value)
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value < 1_000_000_000 ? value : null
}
export async function sessionIsCurrent(
  readUser: (email: string) => Promise<{ id: string; email: string; credentialVersion?: unknown } | null>,
  token: { id?: unknown; email?: unknown; credentialVersion?: unknown }
) {
  if (typeof token.id !== 'string' || !token.id || typeof token.email !== 'string' || !token.email || token.email.length > 254) return false
  const version = credentialVersion(token.credentialVersion)
  if (version === null) return false
  try {
    const account = await readUser(token.email)
    return !!account && account.id === token.id && account.email === token.email && credentialVersion(account.credentialVersion) === version
  } catch { return false }
}
