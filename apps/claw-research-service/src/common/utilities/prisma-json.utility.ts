import type { Prisma } from '../../generated/prisma';

/**
 * Cast a JSON-serializable value to Prisma.InputJsonValue.
 *
 * Centralises the type cast in one place so the rest of the code base does
 * not need `as unknown as Prisma.InputJsonValue` (banned by the
 * `no-restricted-syntax` lint rule). Callers must guarantee the value is a
 * plain JSON-serialisable structure (no Date, BigInt, Map, class instance).
 */
export function toInputJson<T>(value: T): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
