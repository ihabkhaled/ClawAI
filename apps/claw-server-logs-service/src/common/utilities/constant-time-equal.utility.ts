import { timingSafeEqual } from 'node:crypto';

/** Compares two secrets without leaking, through timing, how much matched. */
export function constantTimeEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
