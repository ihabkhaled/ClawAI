// Fixed-window counter in ONE round trip: increment, make sure the key has an
// expiry, and report the count and the seconds left.
//
// INCR followed by a separate EXPIRE is not atomic: a process killed between
// the two leaves a counter with no TTL, and that caller is then refused
// forever. The `ttl < 0` branch also heals a key that lost its expiry. The
// window is fixed, not sliding: later hits never extend it.
export const REDIS_FIXED_WINDOW_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "local ttl = redis.call('TTL', KEYS[1])",
  'if ttl < 0 then',
  "  redis.call('EXPIRE', KEYS[1], ARGV[1])",
  '  ttl = tonumber(ARGV[1])',
  'end',
  'return {count, ttl}',
].join('\n');
