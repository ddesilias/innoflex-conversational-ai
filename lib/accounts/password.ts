import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// Fixed, versioned parameters; never accept work factors from a stored hash.
const prefix = 'scrypt-v1$'
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key))
  })
}
export function validPassword(password: unknown, minimum = 6): password is string {
  return typeof password === 'string' && password.length >= minimum && password.length <= 256
}
export async function hashPassword(password: string) {
  if (!validPassword(password)) throw new Error('Invalid password')
  const salt = randomBytes(32).toString('hex')
  return { salt, password: prefix + (await derive(password, salt)).toString('hex') }
}
export async function verifyPassword(password: string, stored: { password: string; salt: string }) {
  if (!validPassword(password) || typeof stored.password !== 'string' || typeof stored.salt !== 'string') return false
  if (stored.password.startsWith(prefix)) {
    const encoded = stored.password.slice(prefix.length)
    if (!/^[a-f0-9]{128}$/.test(encoded) || !/^[a-f0-9]{64}$/.test(stored.salt)) return false
    return timingSafeEqual(await derive(password, stored.salt), Buffer.from(encoded, 'hex'))
  }
  // Read compatibility only: new accounts never use SHA-256.
  if (!/^[a-f0-9]{64}$/.test(stored.password) || !stored.salt || stored.salt.length > 128) return false
  const legacy = createHash('sha256').update(password + stored.salt).digest()
  return timingSafeEqual(legacy, Buffer.from(stored.password, 'hex'))
}
export function needsPasswordUpgrade(password: string) {
  return !password.startsWith(prefix)
}
