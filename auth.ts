import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import { AuthAttemptError } from './lib/accounts/attempts'
import { sessionIsCurrent } from './lib/accounts/session'
import { authenticateAccount, readSessionAccount } from './lib/accounts/store'

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.credentialVersion = (user as { credentialVersion?: number }).credentialVersion ?? 0
      }
      return await sessionIsCurrent(readSessionAccount, token) ? token : null
    }
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email().max(254),
            password: z.string().min(6).max(256)
          })
          .safeParse(credentials)

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data
          try {
            return await authenticateAccount(email, password)
          } catch (error) {
            // Keep the response independent of whether the account exists.
            if (error instanceof AuthAttemptError && error.status === 429) return null
            throw error
          }
        }

        return null
      }
    })
  ]
})
