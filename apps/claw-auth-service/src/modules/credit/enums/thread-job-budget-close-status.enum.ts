export enum ThreadJobBudgetCloseStatus {
  FINALIZED = 'FINALIZED',
  RELEASED = 'RELEASED',
  /**
   * The platform failed the job and no draft completed (ADR-162 addendum): the plan allowance hold
   * is returned like RELEASED, and the money the Free meter charged for the job's calls is refunded.
   */
  PLATFORM_FAILED = 'PLATFORM_FAILED',
}
