/** What one provider did during one search (ADR-210). */
export enum SearchProviderRunStatus {
  OK = 'OK',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  /** Not called: its circuit breaker was open. */
  SKIPPED = 'SKIPPED',
}
