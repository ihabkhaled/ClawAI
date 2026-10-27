import { type Locale, ThreadArticleLength } from '@claw/shared-types';

import {
  AUTHOR_REPLY_EXAMPLE,
  AUTHOR_REPLY_SHAPE,
  AUTHOR_STRUCTURE_NOTE,
} from '../constants/author-prompt.constants';
import { SHORT_ARTICLE_NOTE } from '../constants/healing-notes.constants';
import { authorGapsNote } from './accepted-gaps-prompt.utility';
import { describeContentLanguage } from './review-prompt.utility';

/**
 * System prompt for the three authors. The JSON, the evidence ids and the citation markers are
 * machine text and stay in ASCII whatever the article language: a right-to-left or non-Latin
 * article otherwise gets its ids rewritten with local digits or brackets, and the citation check
 * then rejects a draft that is otherwise fine.
 */
export function buildAuthorSystemPrompt(
  locale: Locale,
  length?: ThreadArticleLength,
  acceptedGaps: readonly string[] = [],
): string {
  const language = describeContentLanguage(locale);
  return [
    `Write the requested publication in ${language} (${locale}).`,
    'Use only the supplied source and research evidence.',
    `Return only one JSON object shaped ${AUTHOR_REPLY_SHAPE} with no other keys and no code fences.`,
    '"markdown" is the whole article as one string and the body cites with [evidenceId] markers.',
    '"citations" lists every cited evidence item as an object with its id and url copied exactly from researchEvidence.items; never a bare string.',
    `Minimal valid example: ${AUTHOR_REPLY_EXAMPLE}.`,
    `The JSON keys, the evidence ids, the urls and the [evidenceId] markers stay exactly as in researchEvidence.items: ASCII brackets, ASCII digits and letters, never translated, transliterated or converted to ${language} digits. Only the article text is in ${language}.`,
    AUTHOR_STRUCTURE_NOTE,
    'Cite only evidence items from researchEvidence.items. Do not include analysis or hidden reasoning.',
    ...(length === ThreadArticleLength.SHORT ? [SHORT_ARTICLE_NOTE] : []),
    ...(acceptedGaps.length > 0 ? [authorGapsNote(acceptedGaps, locale, language)] : []),
  ].join(' ');
}
