/** Where the browser check of a sign-up or sign-in form stands. */
export enum BotCheckStatus {
  /** Nothing started (sign-in before the server asks for checks). */
  IDLE = 'IDLE',
  /** Solving the proof of work or waiting for a third-party token. */
  CHECKING = 'CHECKING',
  /** Everything the next submit needs is in hand. */
  READY = 'READY',
  /** A part of the check could not run; the submit goes ahead without it. */
  DEGRADED = 'DEGRADED',
}
