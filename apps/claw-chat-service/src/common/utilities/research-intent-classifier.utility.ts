import { CRAWL_INTENT_PATTERNS } from '../constants/research-intent.constants';
import { detectPromptUrls } from './prompt-url.utility';
import { ResearchWorkflow } from '../enums/research-workflow.enum';
import { mapResearchModeToWorkflow } from './research-mode-mapping.utility';
import type { ResearchMode } from '../enums/research-mode.enum';

/**
 * Upgrades an already-enabled research mode to `SITE_CRAWL` when the
 * message's own language unambiguously asks for a whole site — never turns
 * research on by itself, and never runs when the user chose `SEARCH_ONLY`:
 * that mode was selected and priced as one that does not fetch pages at
 * all, so it cannot be upgraded into one that fetches twenty (rule 41 item
 * 3's principle, applied to a new workflow instead of a plain fetch).
 *
 * Deterministic, not a model call: `CRAWL_INTENT_PATTERNS` plus a bare URL
 * presence check. This is deliberately the ONLY auto-routing behaviour
 * built so far — the platform still requires a person to turn research on
 * before any of this runs, a decision recorded when this was built, not
 * something to silently expand from here.
 */
export function classifyResearchWorkflow(mode: ResearchMode, message: string): ResearchWorkflow {
  const baseline = mapResearchModeToWorkflow(mode);
  if (baseline === ResearchWorkflow.SEARCH_ONLY) {
    return baseline;
  }
  // One definition of "this message has a URL" across the service, so a bare
  // `example.com` crawls here exactly as it is detected everywhere else.
  if (detectPromptUrls(message).length === 0) {
    return baseline;
  }
  const hasCrawlIntent = CRAWL_INTENT_PATTERNS.some((pattern) => pattern.test(message));
  return hasCrawlIntent ? ResearchWorkflow.SITE_CRAWL : baseline;
}
