/**
 * Thrown inside a settlement transaction to roll it back when a fenced write
 * matched no row (another caller settled the block, or the free seconds were
 * taken concurrently). Caught by the settlement manager, never surfaced.
 */
export class LiveSettleConflictError extends Error {
  constructor(public readonly reason: string) {
    super(`Live settlement conflict: ${reason}`);
    this.name = 'LiveSettleConflictError';
  }
}
