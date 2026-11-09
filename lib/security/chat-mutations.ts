// Each mutation rechecks ownership inside Redis. Never trust a history index
// to authorize deletion, or write back a stale conversation when sharing it.
export const removeChatScript = `
if redis.call('HGET',KEYS[1],'userId') ~= ARGV[1] then return 0 end
local indexType=redis.call('TYPE',KEYS[2]).ok
if indexType ~= 'none' and indexType ~= 'zset' then return redis.error_reply('Invalid chat index') end
redis.call('DEL',KEYS[1])
redis.call('ZREM',KEYS[2],KEYS[1])
return 1
`

export const shareChatScript = `
if redis.call('HGET',KEYS[1],'userId') ~= ARGV[1] then return 0 end
redis.call('HSET',KEYS[1],'sharePath',ARGV[2])
return 1
`
