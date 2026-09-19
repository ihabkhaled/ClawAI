/** The running log for a thread's current turn. */
export const NARRATION_LOG_KEY_PREFIX = 'claw:chat:narration:';

/** Per-entry once-only marker, so a tick every replica receives is logged once. */
export const NARRATION_DEDUPE_KEY_PREFIX = 'claw:chat:narration:dedupe:';

/** A turn that never finishes must not leave its log in Redis forever. */
export const NARRATION_TTL_SECONDS = 3600;

/**
 * Lines kept per turn. A 40-page crawl emits a tick per page; beyond this the
 * log stops being readable and starts being a transcript of HTTP requests.
 */
export const NARRATION_MAX_ENTRIES = 150;

/**
 * Appends only if this replica is the first to claim the entry.
 *
 * research-service publishes crawl ticks on a pub/sub channel every chat
 * replica subscribes to, so each tick arrived four times in production. SET NX
 * on a per-entry key makes exactly one replica the owner; only the owner
 * appends and streams it. Returns 1 when appended, 0 when a sibling already did.
 *
 * KEYS[1] log list, KEYS[2] dedupe key (or '' for none)
 * ARGV[1] entry JSON, ARGV[2] ttl seconds, ARGV[3] max entries
 */
export const NARRATION_APPEND_SCRIPT = `
if KEYS[2] ~= '' then
  if not redis.call('SET', KEYS[2], '1', 'NX', 'EX', tonumber(ARGV[2])) then
    return 0
  end
end
redis.call('RPUSH', KEYS[1], ARGV[1])
redis.call('LTRIM', KEYS[1], -tonumber(ARGV[3]), -1)
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
return 1
`;

/** Crawl phases worth a line of their own; 'started' and 'done' are narrated by the orchestrator. */
export const NARRATED_CRAWL_PHASES: ReadonlySet<string> = new Set([
  'robots',
  'sitemap',
  'feed',
  'page',
]);
