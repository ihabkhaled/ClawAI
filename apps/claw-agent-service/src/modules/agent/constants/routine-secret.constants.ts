import type { Prisma } from '../../../generated/prisma';

/** What the owner may see of a stored secret: never the ciphertext. */
export const ROUTINE_SECRET_METADATA_SELECT = {
  name: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RoutineSecretSelect;

/** Prisma codes meaning "another writer got there first": unique violation, serialization failure. */
export const ROUTINE_SECRET_CONTENTION_CODES: readonly string[] = ['P2002', 'P2034'];
