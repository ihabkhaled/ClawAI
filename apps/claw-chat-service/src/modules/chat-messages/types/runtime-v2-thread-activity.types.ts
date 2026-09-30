/**
 * Whether a Runtime V2 run is still going on one thread (F095).
 *
 * Deliberately carries no content: a client asks this to decide whether to
 * reattach to a run or start a new turn, and needs nothing else to decide.
 */
export interface RuntimeV2ThreadActivity {
  readonly active: boolean;
  readonly runId?: string;
  /** ISO 8601; when the run's prompt was recorded. */
  readonly startedAt?: string;
}
