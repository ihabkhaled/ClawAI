// Compare-and-delete release, so a job can only ever free the lock IT holds.
//
// A plain DEL would let a slow run whose lock had already expired delete the
// lock a different replica has since acquired, and both would then be inside
// the critical section believing they were alone. The owner token makes the
// check and the delete one atomic step.
//
// Copied verbatim from payment-service's scheduled-job runner rather than
// invented here: two different lock semantics on one Redis is how a job ends up
// double-running in production.
export const REDIS_RELEASE_LOCK_SCRIPT = [
  "if redis.call('get', KEYS[1]) == ARGV[1] then",
  "  return redis.call('del', KEYS[1])",
  'end',
  'return 0',
].join('\n');
