/**
 * A caller's (ultimately the planner model's) guess at how a page must be read.
 * It reorders tiers that are already enabled and eligible; it never enables one,
 * never skips robots.txt, never relaxes the SSRF checks or the 401/451/captcha
 * stop rules (ADR-121 addendum 3, rule 50).
 */
export enum FetchRenderHint {
  /** Client-rendered page: try rendering tiers before plain HTTP. */
  JS = 'js',
  /** Bot-protected site: try browser-like tiers before plain HTTP. */
  STEALTH = 'stealth',
}
