export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** DEL KEYS[1] only when it still holds ARGV[1]; returns 1 when deleted, else 0. */
export const REDIS_COMPARE_AND_DELETE_SCRIPT =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
