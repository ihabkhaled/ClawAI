/**
 * Refusal codes of the anti-abuse checks (contract of 2026-11-27). The web client
 * translates every one of them; the English message is for a log reader only.
 */
export enum AntiAbuseErrorCode {
  /** 428: a required check is missing (register always needs proof of work). */
  BOT_CHECK_REQUIRED = 'BOT_CHECK_REQUIRED',
  /** 403: proof of work wrong/expired/reused, or a captcha provider rejected the token. */
  BOT_CHECK_FAILED = 'BOT_CHECK_FAILED',
  /** 400, field `email`: bundled list or admin blocklist, subdomains included. */
  DISPOSABLE_EMAIL = 'DISPOSABLE_EMAIL',
  /** 400, field `email`: the domain does not exist, or has no MX and no A/AAAA record. */
  EMAIL_DOMAIN_UNDELIVERABLE = 'EMAIL_DOMAIN_UNDELIVERABLE',
  /** 429 + Retry-After: platform-wide or per-device sign-up velocity exceeded. */
  SIGNUP_TEMPORARILY_LIMITED = 'SIGNUP_TEMPORARILY_LIMITED',
  /** 403: this device belongs to a permanently banned account (ADR-233). Generic on purpose. */
  SIGNUP_UNAVAILABLE = 'SIGNUP_UNAVAILABLE',
}
