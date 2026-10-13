import { PRISMA_FOREIGN_KEY_VIOLATION } from '../constants/installs.constants';

/** True for a Prisma "foreign key constraint failed" error (P2003), without importing the client. */
export function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === PRISMA_FOREIGN_KEY_VIOLATION
  );
}
