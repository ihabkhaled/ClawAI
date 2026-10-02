// Fixed-window counter in ONE round trip: increment, make sure the key has an
// expiry, and report the count and the seconds left.
//
// INCR followed by a separate EXPIRE is not atomic: a process killed between
// the two leaves a counter with no TTL, and that caller is then refused
// forever. The `ttl < 0` branch also heals any key that somehow lost its
// expiry. The window is fixed, not sliding: later hits never extend it.
export const REDIS_FIXED_WINDOW_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "local ttl = redis.call('TTL', KEYS[1])",
  'if ttl < 0 then',
  "  redis.call('EXPIRE', KEYS[1], ARGV[1])",
  '  ttl = tonumber(ARGV[1])',
  'end',
  'return {count, ttl}',
].join('\n');

// Gives one hit back to a fixed-window counter: DECR only while it is above
// zero, so a refund never drives a counter negative (which would hand out
// extra attempts) and never creates a key that has no expiry. DECR keeps the
// key's TTL, so the window still ends when it was going to.
export const REDIS_REFUND_WINDOW_SCRIPT = [
  "local count = tonumber(redis.call('GET', KEYS[1]) or '0')",
  'if count > 0 then',
  "  return redis.call('DECR', KEYS[1])",
  'end',
  'return 0',
].join('\n');
