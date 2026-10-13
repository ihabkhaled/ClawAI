/** What the repair did with one job. */
export type OrphanRepairOutcome =
  /** No publication or edit review here points at it, and it was queued or running: cancel asked. */
  | 'CANCELLED'
  /** A publication or edit review here owns it, or it is being attached right now: left alone. */
  | 'IN_USE'
  /** The generation service has no such job for that owner. */
  | 'NOT_FOUND'
  /** It is not queued or running, so there is nothing to stop. */
  | 'ALREADY_FINISHED';

export type OrphanRepairResult = { jobId: string; outcome: OrphanRepairOutcome };
