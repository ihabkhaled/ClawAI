/**
 * Redis fan-out for Live Intelligence (architecture doc section 9). Same shape
 * as chat-service's CHAT_STREAM_PUBLISH_SCRIPT, but one channel per RUN: a run
 * is long-lived and many viewers share it, so per-run channels keep every
 * replica from deserializing frames of streams nobody on it watches.
 */
export const LIVE_RUN_CHANNEL_PREFIX = 'claw:live:run:';

/** Per-run replay buffer read once when a viewer (re)connects. */
export const LIVE_REPLAY_KEY_PREFIX = 'claw:live:replay:';

/** Per-run monotonic counter backing the event id. Shares the replay TTL. */
export const LIVE_SEQUENCE_KEY_PREFIX = 'claw:live:seq:';

/** Frames kept for replay per run. */
export const LIVE_REPLAY_LIMIT = 500;

/** Replay buffer and sequence lifetime after the last frame: 6 h. */
export const LIVE_REPLAY_TTL_SECONDS = 21_600;

/** Largest serialized event accepted (architecture doc section 9). */
export const LIVE_EVENT_MAX_BYTES = 8192;

/** Run ids are cuids; enforced because the id is spliced into JSON inside Lua. */
export const LIVE_RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;

/**
 * Assigns the id, records the frame for replay and fans it out, atomically.
 * Splices `id` and `seq` onto the front of the serialized event without a
 * cjson round-trip (see chat-stream-bus.constants.ts for why).
 *
 * KEYS: [1] sequence key, [2] replay key
 * ARGV: [1] channel, [2] event JSON, [3] run id, [4] replay limit, [5] ttl seconds
 */
export const LIVE_EVENT_PUBLISH_SCRIPT = `
local seq = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[5])
local payload = '{"id":"' .. ARGV[3] .. ':' .. seq .. '","seq":' .. seq .. ',' .. string.sub(ARGV[2], 2)
redis.call('RPUSH', KEYS[2], payload)
redis.call('LTRIM', KEYS[2], -tonumber(ARGV[4]), -1)
redis.call('EXPIRE', KEYS[2], ARGV[5])
redis.call('PUBLISH', ARGV[1], payload)
return seq
`;
