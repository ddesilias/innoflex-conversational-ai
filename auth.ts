import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from './auth.config'
import { z } from 'zod'
import { authenticateAccount } from './lib/accounts/store'

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
          return authenticateAccount(email, password)
        }

        return null
      }
    })
  ]
})
