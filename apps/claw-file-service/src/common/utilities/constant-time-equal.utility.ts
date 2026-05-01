import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string equality. Returns false immediately for length-mismatch
 * (length itself is not a secret). Used by ServiceTokenGuard to defeat
 * byte-by-byte timing attacks on shared secrets.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  return timingSafeEqual(bufA, bufB);
}
