/** The answer of one bot-check evaluation. */
export enum BotCheckOutcome {
  PASSED = 'PASSED',
  /** A check the policy needs was not sent at all -> BOT_CHECK_REQUIRED. */
  REQUIRED = 'REQUIRED',
  /** A check was sent and did not pass -> BOT_CHECK_FAILED. */
  FAILED = 'FAILED',
}
