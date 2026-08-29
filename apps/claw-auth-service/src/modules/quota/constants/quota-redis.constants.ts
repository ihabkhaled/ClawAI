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

// How long a PAYG hold counter survives with no further writes.
//
// Deliberately longer than PAYG_RESERVATION_TTL_MS (15 minutes) so the counter
// outlives every hold the sweeper is responsible for reclaiming. If it expired
// first the counter would reset to zero while money was still held, and the
// next request would be measured against a balance that ignores the in-flight
// one. Postgres still bounds the total (the clamp reads `available` from the
// wallet, which is net of `reservedMicroUsd`), so the failure mode is a smaller
// safety margin rather than free money.
export const CREDIT_HOLD_TTL_SECONDS = 1800;

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

// Outstanding PAYG holds against the perishable GRANT bucket, scoped to the
// period the grant belongs to. Period-scoped because the grant itself resets:
// a hold taken in one period must never be counted against the next one's
// allowance, and the key simply ages out with its period.
export function creditGrantHoldKey(userId: string, periodKey: string): string {
  return `quota:credit:grant:${userId}:${periodKey}`;
}

// Outstanding PAYG holds against the PURCHASED bucket. NOT period-scoped —
// purchased credit never expires, so a period key here would silently forget
// holds at every month boundary.
export function creditPurchasedHoldKey(userId: string): string {
  return `quota:credit:purchased:${userId}`;
}

// KEYS  1..9  day, week, month, providerCost, concurrency, chats, messages,
//             creditGrantHolds, creditPurchasedHolds
// ARGV  1..7  the matching limits for KEYS 1..7
//       8..11 weightedAmount, costAmount, chatsAmount, messagesAmount
//       12..15 dayTtl, weekTtl, monthTtl, concurrencyTtl
//       16..17 creditGrantLimit, creditPurchasedLimit
//       18..19 creditGrantAmount, creditPurchasedAmount
//       20    creditHoldTtl (the PURCHASED holds key; GRANT holds use monthTtl)
//       21    concurrencyAmount
// Returns { ok, window, current, limit } with the numbers as strings.
//
// The two credit windows are windows 8 and 9 rather than a second script
// (ADR-080). The loops were already generic over `i = 1..n` and the
// `amounts[i] > 0` guard means a non-PAYG request skips them for free — an
// extra Lua script would have meant two reservations that can disagree about
// whether a request was admitted.
//
// For the credit windows the ENCODING IS INVERTED relative to the token
// windows, and that is the load-bearing detail: the "limit" is the wallet's
// bucket BALANCE read from Postgres, and the counter is only the currently
// OUTSTANDING HOLDS. Settled spend is subtracted from the balance in Postgres,
// never accumulated in Redis, so losing the Redis tail costs a safety margin
// and not a balance. Prod Redis is RDB-only; a counter that had to survive
// forever would eventually hand out free money.
export const RESERVE_QUOTA_LUA = `
local weighted = tonumber(ARGV[8])
local costAmount = tonumber(ARGV[9])
local chatsAmount = tonumber(ARGV[10])
local messagesAmount = tonumber(ARGV[11])
local creditGrantAmount = tonumber(ARGV[18])
local creditPurchasedAmount = tonumber(ARGV[19])
local concurrencyAmount = tonumber(ARGV[21])

local limits = {
  tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4]),
  tonumber(ARGV[5]), tonumber(ARGV[6]), tonumber(ARGV[7]),
  tonumber(ARGV[16]), tonumber(ARGV[17])
}
local amounts = {
  weighted, weighted, weighted, costAmount, concurrencyAmount,
  chatsAmount, messagesAmount, creditGrantAmount, creditPurchasedAmount
}
local names = {
  'DAY', 'WEEK', 'MONTH', 'PROVIDER_COST', 'CONCURRENCY', 'CHATS', 'MESSAGES',
  'CREDIT_GRANT', 'CREDIT_PURCHASED'
}
local ttls = {
  tonumber(ARGV[12]), tonumber(ARGV[13]), tonumber(ARGV[14]), tonumber(ARGV[14]),
  tonumber(ARGV[15]), tonumber(ARGV[12]), tonumber(ARGV[12]), tonumber(ARGV[14]),
  tonumber(ARGV[20])
}

-- Check every window BEFORE mutating any of them, so a rejection can never
-- leave a partial increment behind on an earlier window.
for i = 1, 9 do
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
for i = 1, 9 do
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
// Already generic over `#KEYS`, so extending the reservation from seven windows
// to nine needed no change here — only `buildAdjustArgv` grew, and the two
// credit deltas are applied by exactly the same clamped, TTL-preserving rules
// as every other window.
//
// Clamps at zero: a double release must never drive a counter negative, which
// would hand the user free quota — or, for the credit windows, free money.
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
