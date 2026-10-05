/**
 * How hard the page the planner is about to have opened is to read, in the
 * planner's own judgement (never a keyword list). It only changes the ORDER in
 * which research-service tries its fetch tiers; robots.txt, SSRF checks and the
 * refusal rules (rule 50, ADR-121) apply exactly as without it.
 */
export enum ResearchRenderHint {
  /** The page is built by client-side JavaScript: try a rendering tier first. */
  JS = 'js',
  /** The site fights plain clients (bot protection): try a browser-like tier first. */
  STEALTH = 'stealth',
}
