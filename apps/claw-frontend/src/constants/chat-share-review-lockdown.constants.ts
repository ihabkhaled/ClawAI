/**
 * Temporary, blanket kill switch for the AdSense "low value content" review
 * window (see docs/03-architecture/adsense-eligibility.md).
 *
 * The per-share `adsEligible`/`indexEligible` fields (chat-service, computed
 * from a safety scan plus content-depth thresholds) remain the correct
 * long-term policy, but during the review window even one share that happens
 * to score eligible is exposure a reviewer can land on. This flag overrides
 * that nuanced per-share system to `false`/`noindex`/excluded for EVERY
 * public chat share — ads, indexing, sitemap and RSS — regardless of what the
 * server computed.
 *
 * Every call site reads this one flag, so lifting it later is a one-line
 * change here, not a hunt across ads/sitemap/RSS/metadata code. Flip to
 * `false` only after both: (1) AdSense has approved the account, and (2) a
 * dedicated content-quality review of shared chats has happened — not on a
 * hunch that the per-share scan is good enough on its own.
 */
export const CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED = true;
