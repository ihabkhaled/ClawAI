/** Lifecycle of a GitHub Actions run, job or step, as GitHub reports it. */
export enum DeploymentRunStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  /** GitHub also uses these for runs held before they start. */
  WAITING = 'waiting',
  REQUESTED = 'requested',
  PENDING = 'pending',
}

/** How a completed run, job or step ended. */
export enum DeploymentRunConclusion {
  SUCCESS = 'success',
  FAILURE = 'failure',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
  TIMED_OUT = 'timed_out',
  ACTION_REQUIRED = 'action_required',
  NEUTRAL = 'neutral',
  STALE = 'stale',
}

/** Why live progress is unavailable, when it is. */
export enum DeploymentRunUnavailableReason {
  /** No credentials, so there is nothing to read GitHub with. */
  NOT_CONFIGURED = 'not_configured',
  /** Credentials exist but GitHub could not be reached or refused the read. */
  UNREACHABLE = 'unreachable',
  /** GitHub answered, but this workflow has never run in that repository. */
  NO_RUNS = 'no_runs',
}
