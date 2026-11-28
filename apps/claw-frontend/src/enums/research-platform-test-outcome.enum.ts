/** What a platform's sample-query test showed on the admin page. */
export enum ResearchPlatformTestOutcome {
  /** The test ran and research-service reported `ok: true`. */
  PASSED = 'PASSED',
  /** The test ran and research-service reported `ok: false` (an `errorCode` may say why). */
  FAILED = 'FAILED',
  /** The request itself failed, so nothing is known about the platform. */
  REQUEST_FAILED = 'REQUEST_FAILED',
}
