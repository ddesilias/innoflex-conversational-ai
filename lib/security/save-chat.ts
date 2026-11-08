// Redis executes this script atomically: ownership check and both writes cannot interleave.
export const saveChatScript = `
local owner = redis.call('HGET', KEYS[1], 'userId')
if owner and owner ~= ARGV[1] then return 0 end
if redis.call('EXISTS', KEYS[1]) == 1 and not owner then return 0 end
local createdAt = redis.call('HGET', KEYS[1], 'createdAt') or ARGV[4]
redis.call('HSET', KEYS[1],
  'userId', ARGV[1], 'id', ARGV[2], 'title', ARGV[3],
  'createdAt', createdAt, 'path', ARGV[5], 'messages', ARGV[6])
redis.call('ZADD', KEYS[2], ARGV[7], KEYS[1])
return 1
`
