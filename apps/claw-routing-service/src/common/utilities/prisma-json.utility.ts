import type { Prisma } from '../../generated/prisma';

/**
 * Cast a JSON-serializable value to Prisma.InputJsonValue.
 *
 * Prisma's `InputJsonValue` is structurally `string | number | boolean |
 * JsonObject | JsonArray`, but TypeScript cannot infer this for arbitrary
 * object literals carrying optional properties — every call site otherwise
 * has to write `value as unknown as Prisma.InputJsonValue`, which the
 * `banAsUnknownAsCast` lint rule (correctly) bans.
 *
 * This helper localises the cast in one place. Callers must guarantee that
 * the value is a plain JSON-serializable structure (no Date, BigInt, Map,
 * or class instances).
 */
export function toInputJson<T>(value: T): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
