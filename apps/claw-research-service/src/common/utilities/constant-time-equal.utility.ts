import { timingSafeEqual } from 'node:crypto';

/**
 * Compares two secrets without leaking their contents through timing.
 *
 * A naive `===` on strings short-circuits at the first differing byte, so an
 * attacker can recover a shared secret one character at a time by measuring
 * response latency. `timingSafeEqual` always reads both buffers fully.
 *
 * It throws on a length mismatch, so the lengths are compared first — that
 * comparison leaks only the length, which is not the secret.
 */
export function constantTimeEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, expectedBuffer);
}
