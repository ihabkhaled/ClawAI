import { EXPLICIT_FETCH_COMMAND_PATTERNS } from '../constants/explicit-fetch-intent.constants';
import { ResearchMode } from '../enums/research-mode.enum';
import { detectPromptUrls } from './prompt-url.utility';

/**
 * The research mode to run for a message that explicitly commands a page to be
 * fetched, or null when it does not.
 *
 * Research used to run only when the user had turned it on, so "crawl <url>" with
 * research off answered "I have no fetched evidence" without a page ever being
 * opened — a tool the platform has, that the user asked for by name, not used.
 * This reads the COMMAND, not the mere presence of a link: a URL pasted into a
 * question still needs research turned on, exactly as before. The caller must
 * still check the plan's research access; this only decides intent.
 *
 * SEARCH_FETCH: it opens the pasted URL (and `classifyResearchWorkflow` upgrades
 * it to a crawl when the message says "crawl").
 */
export function resolveExplicitFetchMode(message: string): ResearchMode | null {
  if (detectPromptUrls(message).length === 0) {
    return null;
  }
  return EXPLICIT_FETCH_COMMAND_PATTERNS.some((pattern) => pattern.test(message))
    ? ResearchMode.SEARCH_FETCH
    : null;
}
