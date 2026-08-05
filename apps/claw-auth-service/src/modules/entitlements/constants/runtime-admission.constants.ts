export const RUNTIME_ADMISSION_TTL_SECONDS = 86_400;

/**
 * Sentinel for "no daily ceiling" — admins and unlimited plans.
 *
 * It cannot be 0. This repository's own rule is "`null` means unlimited, `0`
 * means disabled; they are not interchangeable", and passing 0 for an admin
 * broke exactly that way: the Lua compares `current + estimate > limit`, and
 * the quota counter is SHARED with ordinary chat usage. As soon as a user sent
 * a normal message the counter went non-zero, and every later Runtime start
 * evaluated `248 + 0 > 0` — denying the admin for the rest of the 24h window
 * with "Runtime token quota is exhausted".
 *
 * Negative means unlimited, so the check is skipped rather than satisfied by
 * arithmetic that only happened to work while the counter was exactly zero.
 */
export const RUNTIME_ADMISSION_UNLIMITED = -1;

export const RUNTIME_ADMISSION_RESERVE_LUA = `
local fingerprint = redis.call('HGET', KEYS[1], 'fingerprint')
if fingerprint then
  if fingerprint ~= ARGV[1] then return {'CONFLICT', 'RUNTIME_ADMISSION_CONFLICT'} end
  return {'REPLAY', redis.call('HGET', KEYS[1], 'ack')}
end
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
local estimate = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
if limit >= 0 and current + estimate > limit then return {'DENIED', 'RUNTIME_QUOTA_EXCEEDED'} end
redis.call('INCRBY', KEYS[2], estimate)
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[4]))
redis.call('HSET', KEYS[1], 'fingerprint', ARGV[1], 'ack', ARGV[5], 'estimate', ARGV[2], 'status', 'reserved')
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[4]))
return {'OK', ARGV[5]}
`;

export const RUNTIME_ADMISSION_RELEASE_LUA = `
local status = redis.call('HGET', KEYS[1], 'status')
if not status or status == 'released' then return {'OK', 'INERT'} end
local estimate = tonumber(redis.call('HGET', KEYS[1], 'estimate') or '0')
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
redis.call('SET', KEYS[2], tostring(math.max(0, current - estimate)), 'KEEPTTL')
redis.call('HSET', KEYS[1], 'status', 'released')
return {'OK', 'RELEASED'}
`;
