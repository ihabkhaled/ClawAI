import { type Prisma } from '../../generated/prisma';

/** Deep-copies a plain value into the shape Prisma accepts for a Json column. */
export function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
