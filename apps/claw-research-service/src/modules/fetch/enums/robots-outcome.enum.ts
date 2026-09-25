/** What robots.txt says about one URL for the `ClawAI-ResearchBot` token (RFC 9309). */
export enum RobotsOutcome {
  /** A 2xx robots.txt allows the path, or robots.txt is 4xx (no rules = allow all). */
  ALLOWED = 'ALLOWED',
  /** An explicit `Disallow` matches. The fetch is refused outright — no tier runs. */
  DISALLOWED = 'DISALLOWED',
  /**
   * robots.txt answered 5xx or could not be reached. RFC 9309 §2.3.1.4: assume
   * complete disallow of the ORIGIN — only the off-origin public archive may run.
   */
  UNREACHABLE = 'UNREACHABLE',
}
