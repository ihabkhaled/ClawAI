// Redis key builders and the Lua scripts backing atomic quota reservation.
//
// Every window is evaluated in ONE server-side script. Independent
// check-then-increment commands are not equivalent: two concurrent requests can
// both read "one slot left" and both pass. Lua runs to completion without
// interleaving, so the check and the increment are a single atomic step.
//
// Limit encoding, applied consistently everywhere:
//   -1  unlimited — not enforced, but still counted for reporting
//    0  disabled  — any positive amount is rejected
//   >0  the actual ceiling
// null/undefined never reaches Redis; the service maps it to -1 or 0 explicitly
// so the three meanings can never blur together.

export const QUOTA_UNLIMITED = -1;

// Safety net so a crashed request cannot leak a concurrency slot forever.
export const CONCURRENCY_SLOT_TTL_SECONDS = 3600;

export function weightedQuotaKey(userId: string, window: string, periodKey: string): string {
  return `quota:w:${userId}:${window}:${periodKey}`;
}

export function providerCostKey(userId: string, monthKey: string): string {
  return `quota:cost:${userId}:${monthKey}`;
}

export function concurrencyKey(userId: string): string {
  return `quota:conc:${userId}`;
}

export function chatsKey(userId: string, dayKey: string): string {
  return `quota:chats:${userId}:${dayKey}`;
}

export function messagesKey(userId: string, dayKey: string): string {
  return `quota:msgs:${userId}:${dayKey}`;
}

export function featureUsageKey(userId: string, feature: string, periodKey: string): string {
  return `quota:feat:${userId}:${feature}:${periodKey}`;
}

// KEYS  1..7 day, week, month, providerCost, concurrency, chats, messages
// ARGV  1..7 the matching limits
//       8..11 weightedAmount, costAmount, chatsAmount, messagesAmount
//       12..15 dayTtl, weekTtl, monthTtl, concurrencyTtl
// Returns { ok, window, current, limit } with the numbers as strings.
export const RESERVE_QUOTA_LUA = `
local weighted = tonumber(ARGV[8])
local costAmount = tonumber(ARGV[9])
local chatsAmount = tonumber(ARGV[10])
local messagesAmount = tonumber(ARGV[11])

local limits = {
  tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4]),
  tonumber(ARGV[5]), tonumber(ARGV[6]), tonumber(ARGV[7])
}
local amounts = { weighted, weighted, weighted, costAmount, 1, chatsAmount, messagesAmount }
local names = { 'DAY', 'WEEK', 'MONTH', 'PROVIDER_COST', 'CONCURRENCY', 'CHATS', 'MESSAGES' }
local ttls = {
  tonumber(ARGV[12]), tonumber(ARGV[13]), tonumber(ARGV[14]), tonumber(ARGV[14]),
  tonumber(ARGV[15]), tonumber(ARGV[12]), tonumber(ARGV[12])
}

-- Check every window BEFORE mutating any of them, so a rejection can never
-- leave a partial increment behind on an earlier window.
for i = 1, 7 do
  local limit = limits[i]
  if limit >= 0 and amounts[i] > 0 then
    local current = tonumber(redis.call('GET', KEYS[i]) or '0')
    if current + amounts[i] > limit then
      return { 0, names[i], tostring(current), tostring(limit) }
    end
  end
end

-- Counters advance even for unlimited windows: usage reporting and the
-- reconciliation job both need the real number, not a gap.
for i = 1, 7 do
  if amounts[i] > 0 then
    local total = redis.call('INCRBY', KEYS[i], amounts[i])
    if total == amounts[i] then
      redis.call('EXPIRE', KEYS[i], ttls[i])
    end
  end
end

return { 1, '', '0', '0' }
`;

// Signed adjustment, used for BOTH release (negative deltas) and
// estimate-to-actual reconciliation (either direction). One script instead of
// two keeps the clamping and TTL rules in a single place.
//
// Clamps at zero: a double release must never drive a counter negative, which
// would hand the user free quota.
//
// The EXISTS guard matters twice over. Writing to a missing key would recreate
// it without a TTL and leak the counter past its period; and when a period has
// rolled over between reserve and finalize, the old window is simply gone —
// charging the NEW period for the previous period's usage would be wrong.
export const ADJUST_QUOTA_LUA = `
for i = 1, #KEYS do
  local delta = tonumber(ARGV[i])
  if delta ~= 0 and redis.call('EXISTS', KEYS[i]) == 1 then
    local current = tonumber(redis.call('GET', KEYS[i]) or '0')
    local next = current + delta
    if next < 0 then next = 0 end
    redis.call('SET', KEYS[i], next, 'KEEPTTL')
  end
end
return 1
`;
