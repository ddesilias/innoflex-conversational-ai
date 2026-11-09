import { accountNamespace } from '@/lib/accounts/keys'

export function messagingPrefix(env: NodeJS.ProcessEnv = process.env) {
  const namespace = accountNamespace(env)
  const scope =
    env.VERCEL_ENV === 'production'
      ? 'production'
      : env.VERCEL_ENV === 'preview'
        ? 'preview'
        : 'local'
  if (scope !== 'production' && !namespace)
    throw Error('Messaging namespace required')
  return `messages:${scope}:${namespace || 'default'}:`
}
export function validRoomId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
  )
}
export function memberIndex(user: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(user)) throw Error('Invalid identity')
  return messagingPrefix() + 'user:' + user
}
export function roomKey(id: string) {
  if (!validRoomId(id)) throw Error('Invalid room')
  return messagingPrefix() + 'room:' + id
}
export const createRoomScript = `
local t=redis.call('TYPE',KEYS[1]).ok
if t~='none' and t~='set' then return redis.error_reply('Invalid member index') end
if redis.call('SCARD',KEYS[1])>=10 then return 0 end
if redis.call('EXISTS',KEYS[2])==1 or redis.call('EXISTS',KEYS[3])==1 then return 0 end
redis.call('HSET',KEYS[2],'owner',ARGV[1],'name',ARGV[2],'createdAt',ARGV[3])
redis.call('SADD',KEYS[1],ARGV[4])
redis.call('SET',KEYS[3],ARGV[4],'EX',86400)
return 1
`
export const joinRoomScript = `
local id=redis.call('GET',KEYS[1])
if not id or id~=ARGV[2] then return 0 end
local owner=redis.call('HGET',KEYS[2],'owner')
if not owner or owner==ARGV[1] then return 0 end
local t=redis.call('TYPE',KEYS[3]).ok
if t~='none' and t~='set' then return redis.error_reply('Invalid member index') end
if redis.call('HGET',KEYS[2],'guest') then return 0 end
if redis.call('SCARD',KEYS[3])>=10 then return 0 end
redis.call('HSET',KEYS[2],'guest',ARGV[1])
redis.call('SADD',KEYS[3],id)
redis.call('DEL',KEYS[1])
return 1
`
export const readRoomScript = `
local owner=redis.call('HGET',KEYS[1],'owner')
local guest=redis.call('HGET',KEYS[1],'guest')
if not owner or (owner~=ARGV[1] and guest~=ARGV[1]) then return '' end
return cjson.encode({name=redis.call('HGET',KEYS[1],'name'),joined=guest~=false,messages=redis.call('LRANGE',KEYS[2],0,-1)})
`
export const sendMessageScript = `
local owner=redis.call('HGET',KEYS[1],'owner')
local guest=redis.call('HGET',KEYS[1],'guest')
if not owner or (owner~=ARGV[1] and guest~=ARGV[1]) then return 0 end
local t=redis.call('TYPE',KEYS[2]).ok
if t~='none' and t~='list' then return redis.error_reply('Invalid message history') end
for _,raw in ipairs(redis.call('LRANGE',KEYS[2],-200,-1)) do
 local m=cjson.decode(raw)
 if m.id==ARGV[2] and m.author==ARGV[1] then return 1 end
end
local count=tonumber(redis.call('GET',KEYS[3]) or '0')
if count>=10 then return -1 end
redis.call('INCR',KEYS[3])
if count==0 then redis.call('EXPIRE',KEYS[3],60) end
redis.call('RPUSH',KEYS[2],ARGV[3])
redis.call('LTRIM',KEYS[2],-200,-1)
return 1
`
