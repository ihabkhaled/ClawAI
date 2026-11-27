/** What one captcha provider said about one token. */
export enum CaptchaOutcome {
  PASSED = 'PASSED',
  /** The provider answered and refused (bad token, wrong action, score too low). */
  REJECTED = 'REJECTED',
  /** No usable answer (network error, timeout, non-2xx, unreadable body). */
  UNREACHABLE = 'UNREACHABLE',
}
