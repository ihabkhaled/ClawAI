import { detectUrlsInText } from '@claw/shared-utilities';

import { PROMPT_URL_MAX_PER_MESSAGE } from '../constants/prompt-url.constants';

/**
 * Every web URL a user put in their message, as absolute http(s) URLs.
 *
 * Separate from research entirely. A link is not a search request — it is the
 * user pointing at a specific page and expecting it to be read. That is true
 * whether research is on, off, or automatic, which is why crawling keys off
 * this and not off ResearchMode.
 *
 * Detection is the shared `detectUrlsInText`, which also catches a link written
 * the way people actually type one — `example.com/pricing`, `www.site.org`.
 * This used to require `http(s)://`, so "summarise example.com" was answered
 * from training data with no page ever opened, and research-service applied
 * the same rule, so the two could disagree about whether a message had a URL.
 *
 * EVERY url found is returned, up to PROMPT_URL_MAX_PER_MESSAGE. The bound is
 * a safety limit on untrusted input, not a product decision: a pasted list of
 * two hundred links must not become two hundred outbound crawls. Whether a URL
 * may actually be FETCHED (private hosts, cloud metadata) stays research-
 * service's fetch guard's decision.
 */
export function detectPromptUrls(message: string): string[] {
  return detectUrlsInText(message, { max: PROMPT_URL_MAX_PER_MESSAGE });
}
