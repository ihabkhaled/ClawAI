/**
 * `live.run_ended` (ADR-221). One shared Live Intelligence analysis run has
 * stopped. Ids, timings and totals only: never transcript, summary, stream URL
 * or provider key. `reason` is live-service's own machine-readable code
 * (`SOURCE_ENDED`, `NO_VIEWERS`, `CAPACITY`, `BUDGET`, `ADMIN_STOPPED`,
 * `FAILED`, ...), kept a string here so a new reason is not a shared-package
 * release.
 */
export interface LiveRunEndedPayload {
  runId: string;
  sourceId: string;
  reason: string;
  startedAt: string;
  endedAt: string;
  /** Seconds of media analysed by the run. */
  analysedSeconds: number;
  /** Platform-paid provider cost recorded for the run, integer micro-USD. */
  providerCostMicroUsd: number;
  /** Distinct viewers who watched with AI on during the run. */
  viewerCount: number;
  timestamp: string;
}
