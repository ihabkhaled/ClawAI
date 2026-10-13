/**
 * The defined answers of a Threads model-call reservation.
 *
 * Only RESERVED and ALREADY_RESERVED let the call proceed. The rest say WHY it
 * cannot, so a spend cap is never reported as a billing outage and a retried
 * request id is never reported as an empty wallet.
 */
export enum ThreadCallReserveOutcome {
  /** A new reservation (or a finished attempt reopened for a retry). */
  RESERVED = 'RESERVED',
  /** The same call was reserved already (a duplicate or retried request). */
  ALREADY_RESERVED = 'ALREADY_RESERVED',
  /** The same credit hold was already settled; there is nothing left to run. */
  ALREADY_FINALIZED = 'ALREADY_FINALIZED',
  /** The same credit hold was already given back. */
  ALREADY_RELEASED = 'ALREADY_RELEASED',
  /** Genuine exhaustion: this call does not fit what is left of the cap. */
  CAP_EXCEEDED = 'CAP_EXCEEDED',
  /** The job's budget is finalized or released (the job ended or was cancelled). */
  BUDGET_CLOSED = 'BUDGET_CLOSED',
  BUDGET_NOT_FOUND = 'BUDGET_NOT_FOUND',
}
