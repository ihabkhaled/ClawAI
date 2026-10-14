/** Where one healing attempt ended; PENDING while the attempt has not finished (ADR-181). */
export enum ThreadHealingResult {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}
