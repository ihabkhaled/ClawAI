import { ResearchMode } from '../../../common/enums/research-mode.enum';
import {
  AUTO_RESEARCH_RECENCY_MARKERS,
  AUTO_RESEARCH_REQUEST_MARKERS,
} from '../../../common/constants/auto-research.constants';
import { detectPromptUrls } from '../../../common/utilities/prompt-url.utility';

/**
 * What research this prompt needs, when the user has not said.
 *
 * Research used to be entirely manual: the composer defaulted to NONE, so a
 * question about today's news was answered from training data unless the user
 * remembered to flip a selector first. Most people never do, and the ones who
 * do should not have to.
 *
 * Deliberately CONSERVATIVE. A miss costs what the product already did — an
 * un-researched answer — while a false positive spends the user's search
 * allowance and adds latency to a question that never needed the web. So this
 * fires on explicit evidence and stays quiet otherwise.
 *
 * A URL in the prompt is the strongest and the only language-independent
 * signal: "summarise https://..." is a fetch request in every language, and it
 * is also the case the old flow handled worst — the page was simply ignored
 * unless the user had pre-selected a fetch mode.
 *
 * The keyword lists are English-only, which is a real limitation for a
 * thirteen-locale product: a Japanese prompt asking for today's news resolves
 * to NONE and answers exactly as it does today. The URL rule still covers every
 * locale, and widening the markers is a translation task, not a redesign.
 */
export function resolveAutoResearchMode(prompt: string): ResearchMode {
  const normalized = prompt.toLowerCase();

  if (detectPromptUrls(prompt).length > 0) {
    return ResearchMode.SEARCH_FETCH;
  }
  const wantsCurrentInfo = AUTO_RESEARCH_RECENCY_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
  const asksForResearch = AUTO_RESEARCH_REQUEST_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
  return wantsCurrentInfo || asksForResearch ? ResearchMode.SEARCH : ResearchMode.NONE;
}

/**
 * Collapses AUTO to a concrete mode; every other mode is the user's explicit
 * choice and is returned untouched.
 */
export function resolveEffectiveResearchMode(
  mode: ResearchMode | undefined,
  prompt: string,
): ResearchMode {
  if (mode === undefined) {
    return ResearchMode.NONE;
  }
  return mode === ResearchMode.AUTO ? resolveAutoResearchMode(prompt) : mode;
}
