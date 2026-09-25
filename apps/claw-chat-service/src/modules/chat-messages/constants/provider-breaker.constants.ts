import { PROVIDER_BREAKER_OPEN_MS } from './provider-credit.constants';

// ── Shared (Redis) account-exhaustion breaker (ADR-125 addendum) ──────────
//
// Prod runs 4 chat-service replicas. The breaker used to be one Map per
// replica, so an exhausted account was dialled (and failed) once per replica
// per window and probed once per replica per half-open. These keys make it
// one breaker for the fleet.

/** `<prefix><provider>` → JSON StoredProviderBreakerState, PX-expiring. */
export const PROVIDER_BREAKER_STATE_KEY_PREFIX = 'claw:chat:provider-breaker:state:';
/** `<prefix><provider>` → probe owner token, SET NX PX: one probe across replicas. */
export const PROVIDER_BREAKER_PROBE_KEY_PREFIX = 'claw:chat:provider-breaker:probe:';
/** SET of providers that may have a state key, for the admin listing. */
export const PROVIDER_BREAKER_INDEX_KEY = 'claw:chat:provider-breaker:index';

/**
 * A probe that never reports back is abandoned after one more window (same as
 * the in-memory breaker), so the probe key lives for one window.
 */
export const PROVIDER_BREAKER_PROBE_TTL_MS = PROVIDER_BREAKER_OPEN_MS;
/**
 * The state key outlives the open window by two probe windows; every granted
 * probe re-extends it. A breaker nobody touches for that long expires (fails
 * open): the next call is an ordinary call, never a permanent skip.
 */
export const PROVIDER_BREAKER_STATE_TTL_MS = PROVIDER_BREAKER_OPEN_MS * 3;
/**
 * Redis gets this long per breaker command. The breaker sits in front of every
 * model call, so a slow Redis must cost milliseconds, not a hung turn; past it
 * the replica answers from its own in-memory copy.
 */
export const PROVIDER_BREAKER_REDIS_DEADLINE_MS = 250;

/**
 * Admission, atomic across replicas. KEYS[1] state, KEYS[2] probe.
 * ARGV[1] now (ms), ARGV[2] probe TTL, ARGV[3] state TTL, ARGV[4] probe token.
 * Returns 0 closed, 1 open (or a sibling holds the probe), 2 probe granted.
 */
export const PROVIDER_BREAKER_ADMIT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 0
end
local state = cjson.decode(raw)
if tonumber(ARGV[1]) < tonumber(state.openUntil) then
  return 1
end
if redis.call('SET', KEYS[2], ARGV[4], 'NX', 'PX', tonumber(ARGV[2])) then
  redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[3]))
  return 2
end
return 1
`;

/** Trip (or re-trip after a failed probe). KEYS state, probe, index; ARGV JSON, TTL, provider. */
export const PROVIDER_BREAKER_TRIP_SCRIPT = `
redis.call('SET', KEYS[1], ARGV[1], 'PX', tonumber(ARGV[2]))
redis.call('DEL', KEYS[2])
redis.call('SADD', KEYS[3], ARGV[3])
return 1
`;

/** Close (successful probe or admin clear). Returns 1 when a breaker existed. */
export const PROVIDER_BREAKER_CLOSE_SCRIPT = `
local existed = redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
redis.call('SREM', KEYS[3], ARGV[1])
return existed
`;

/**
 * Every live breaker, pruning index members whose state expired. KEYS[1]
 * index; ARGV[1] state prefix, ARGV[2] probe prefix. Returns a flat list of
 * provider, stateJson, probing (0|1) triples.
 */
export const PROVIDER_BREAKER_LIST_SCRIPT = `
local out = {}
for _, provider in ipairs(redis.call('SMEMBERS', KEYS[1])) do
  local raw = redis.call('GET', ARGV[1] .. provider)
  if raw then
    table.insert(out, provider)
    table.insert(out, raw)
    table.insert(out, redis.call('EXISTS', ARGV[2] .. provider))
  else
    redis.call('SREM', KEYS[1], provider)
  end
end
return out
`;

/** Redis answers 0 / 1 / 2 from the admit script. */
export const PROVIDER_BREAKER_ADMIT_OPEN = 1;
export const PROVIDER_BREAKER_ADMIT_PROBE = 2;

/** A provider name as the chokepoint sees it (the connector provider enum). */
export const PROVIDER_BREAKER_PROVIDER_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;
