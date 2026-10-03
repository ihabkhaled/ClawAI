import { ResearchMode } from '../../../common/enums/research-mode.enum';
import {
  AUTO_RESEARCH_RECENCY_MARKERS,
  AUTO_RESEARCH_REQUEST_MARKERS,
} from '../../../common/constants/auto-research.constants';
import { detectPromptUrls } from '../../../common/utilities/prompt-url.utility';
import { isTrivialUserText } from './attachment-only-turn.utility';
import { containsResearchMarker } from './research-marker-match.utility';

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
 * The marker lists cover the 13 UI locales and match whole words only ("news"
 * never fires on "newsletter"). They are a hint for the lab/parallel lanes that
 * pick a research mode themselves; the main chat turn asks the RESEARCH_GATE
 * model instead, which reads the sentence in any language.
 */
export function resolveAutoResearchMode(prompt: string): ResearchMode {
  if (detectPromptUrls(prompt).length > 0) {
    return ResearchMode.SEARCH_FETCH;
  }
  const wantsCurrentInfo = containsResearchMarker(prompt, AUTO_RESEARCH_RECENCY_MARKERS);
  const asksForResearch = containsResearchMarker(prompt, AUTO_RESEARCH_REQUEST_MARKERS);
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
  // An attachment-only send ("" or ".") has no text to search for, whatever
  // mode was selected: the attachment is the question, and a search on
  // nothing spends the user's allowance to hand the model noise.
  if (mode === undefined || isTrivialUserText(prompt)) {
    return ResearchMode.NONE;
  }
  return mode === ResearchMode.AUTO ? resolveAutoResearchMode(prompt) : mode;
}
