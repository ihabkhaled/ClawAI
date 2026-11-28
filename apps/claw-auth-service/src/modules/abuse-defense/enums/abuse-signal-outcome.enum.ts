/** What recording one signal led to. Only the tests and the structured log read it; no caller branches on it for a user. */
export enum AbuseSignalOutcome {
  /** Counted or stored, below every threshold. */
  RECORDED = 'RECORDED',
  /** The kill switch is off: the signal is stored and nothing else happens. */
  RECORDED_ONLY = 'RECORDED_ONLY',
  /** The signal can never suspend (UNCOUNTED code). */
  FLAGGED = 'FLAGGED',
  /** A threshold was crossed and the account is now suspended. */
  SUSPENDED = 'SUSPENDED',
  /** A threshold was crossed but the account is already banned or suspended. */
  ALREADY_BLOCKED = 'ALREADY_BLOCKED',
  /** A threshold was crossed on an administrator account: never auto-suspended, left to a human. */
  PROTECTED_ACCOUNT = 'PROTECTED_ACCOUNT',
  /** The counter store could not answer, so nothing could be counted (fails open). */
  UNCOUNTED_NO_STORE = 'UNCOUNTED_NO_STORE',
  /** Not recorded: unknown account or an input that could not be a signal. */
  IGNORED = 'IGNORED',
}
