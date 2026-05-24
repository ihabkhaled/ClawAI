import type { Prisma } from '../../generated/prisma';

/**
 * Normalise a plain DTO into a Prisma.InputJsonValue without resorting to
 * `as unknown as X` casts. Round-tripping through JSON guarantees the value
 * matches Prisma's contract (no Date / Function / BigInt / undefined).
 */
export function toPrismaJsonInput<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Inverse — read a Prisma JsonValue back into a typed DTO. The caller is
 * trusted to know the shape (the value was written with toPrismaJsonInput).
 */
export function fromPrismaJsonValue<T>(value: Prisma.JsonValue): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
