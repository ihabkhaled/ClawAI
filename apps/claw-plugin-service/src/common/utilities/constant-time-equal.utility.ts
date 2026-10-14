import { timingSafeEqual } from 'node:crypto';

/**
 * Compares two secrets without leaking their contents through timing. `timingSafeEqual` throws on
 * a length mismatch, so lengths are compared first; that leaks only the length, not the secret.
 */
export function constantTimeEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return providedBuffer.length === expectedBuffer.length
    ? timingSafeEqual(providedBuffer, expectedBuffer)
    : false;
}
