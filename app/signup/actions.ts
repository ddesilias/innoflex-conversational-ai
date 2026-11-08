'use server'

import { signIn } from '@/auth'
import { ResultCode } from '@/lib/utils'
import { z } from 'zod'
import { createAccount } from '@/lib/accounts/store'
import { AuthError } from 'next-auth'

interface Result {
  type: string
  resultCode: ResultCode
}

export async function signup(
  _prevState: Result | undefined,
  formData: FormData
): Promise<Result | undefined> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const parsedCredentials = z
    .object({
      email: z.string().email().max(254),
      password: z.string().min(12).max(256)
    })
    .safeParse({
      email,
      password
    })

  if (parsedCredentials.success) {
    try {
      const created = await createAccount(email, password)
      const result = created
        ? { type: 'success', resultCode: ResultCode.UserCreated }
        : { type: 'error', resultCode: ResultCode.UserAlreadyExists }

      if (result.resultCode === ResultCode.UserCreated) {
        await signIn('credentials', {
          email,
          password,
          redirect: false
        })
      }

      return result
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return {
              type: 'error',
              resultCode: ResultCode.InvalidCredentials
            }
          default:
            return {
              type: 'error',
              resultCode: ResultCode.UnknownError
            }
        }
      } else {
        return {
          type: 'error',
          resultCode: ResultCode.UnknownError
        }
      }
    }
  } else {
    return {
      type: 'error',
      resultCode: ResultCode.InvalidCredentials
    }
  }
}
