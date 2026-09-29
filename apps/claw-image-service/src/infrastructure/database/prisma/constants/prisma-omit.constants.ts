/**
 * Columns no ordinary read returns. Rows are sent to the browser as-is, and
 * `paygReservationId` is an internal auth-service id only the stale-job
 * recovery needs — it opts back in with `omit: { paygReservationId: false }`.
 */
export const PRISMA_GLOBAL_OMIT = {
  imageGeneration: { paygReservationId: true },
} as const;
