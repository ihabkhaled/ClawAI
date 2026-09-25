/**
 * Why a fetch attempt looks blocked, produced by `classifyBlockSignal`.
 * `FetchStrategyOrchestratorService` reads it through the escalation policy
 * (`escalation-policy.utility.ts`) to decide which strategies may still run —
 * some signals are a reason to escalate, some are a refusal the chain must
 * respect. The last one seen is written to `HostStrategyMemory.lastBlockSignal`.
 */
export enum BlockSignalKind {
  /** No block detected; the result can be trusted as-is. */
  NONE = 'NONE',
  /** HTTP 429, or a page that says to slow down. Only off-origin tiers may follow. */
  RATE_LIMITED = 'RATE_LIMITED',
  /** HTTP 403 — usually a bot/fingerprint rule, so a better client may pass. */
  FORBIDDEN = 'FORBIDDEN',
  /** HTTP 401/407: the page needs credentials. Terminal — never evaded. */
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  /** HTTP 451: withheld for legal reasons. Terminal — never evaded. */
  LEGAL_UNAVAILABLE = 'LEGAL_UNAVAILABLE',
  /** HTTP 404/410 or an unresolvable host: the page is gone. Only the archive may follow. */
  NOT_FOUND = 'NOT_FOUND',
  /**
   * robots.txt answered 5xx or was unreachable, so RFC 9309 says assume the
   * origin disallows everything. Set before the chain starts; only the
   * off-origin archive may follow.
   */
  ROBOTS_UNREACHABLE = 'ROBOTS_UNREACHABLE',
  /** HTTP 503 or a known interstitial marker (Cloudflare "Just a moment", etc.). */
  JS_CHALLENGE = 'JS_CHALLENGE',
  /** A captcha marker was found. Never solved — only the public archive may follow. */
  CAPTCHA = 'CAPTCHA',
  /** HTML shell with almost no extracted text — likely client-rendered. */
  EMPTY_JS_SHELL = 'EMPTY_JS_SHELL',
  /** Any other non-2xx status or thrown error not matching a signal above. */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
