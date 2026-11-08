import { kv } from '@vercel/kv'
import { consumeQuota } from './quota'

export function reserveUsage(userId: string, kind: 'ai' | 'avatar') {
  return consumeQuota((script, keys, args) => kv.eval(script, keys, args), userId, kind,
    kind === 'ai' ? process.env.AI_DAILY_REQUEST_LIMIT : process.env.AVATAR_DAILY_TOKEN_LIMIT)
}
