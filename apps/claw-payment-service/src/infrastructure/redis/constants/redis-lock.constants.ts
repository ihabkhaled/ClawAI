export const REDIS_RELEASE_LOCK_SCRIPT = [
  "if redis.call('get', KEYS[1]) == ARGV[1] then",
  "  return redis.call('del', KEYS[1])",
  'end',
  'return 0',
].join('\n');
