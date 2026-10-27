import type { Locale } from '@claw/shared-types';

import { REVIEW_CRITERIA, REVIEW_REPLY_SHAPE } from '../constants/review-prompt.constants';
import { ReviewerRole } from '../types/reviewer-role.enum';
import { reviewGapsNote } from './accepted-gaps-prompt.utility';

/** English name of a locale for use inside a prompt ("Spanish"), falling back to the code. */
export function describeContentLanguage(locale: Locale): string {
  return new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) ?? locale;
}

/**
 * System prompt for the Judge and the Critic. The owner chose the article language, so it is
 * the right language even when the topic, the source conversation or the evidence are written in
 * another one. The reviewers must not mark it down, ask for a rewrite or translation, or call the
 * mismatch a blocker, and they write their findings and revision brief in that language so the
 * authors get the next brief in the language they are writing.
 */
export function buildReviewSystemPrompt(
  reviewer: ReviewerRole,
  locale: Locale,
  candidateCount = 1,
  acceptedGaps: readonly string[] = [],
): string {
  const language = describeContentLanguage(locale);
  return [
    `Review the draft independently as ${reviewer}.`,
    `The owner requested this publication in ${language} (${locale}), so ${language} is the correct language for the draft even when the topic, the source conversation or the evidence are written in another language.`,
    `Never lower the score, add a blocker, or ask for a rewrite or a translation because the draft's language differs from the language of the topic, source or evidence. Raise a language blocker only if the draft is not written in ${language}.`,
    REVIEW_CRITERIA,
    ...(acceptedGaps.length > 0 ? [reviewGapsNote()] : []),
    `Write every finding and the revisionBrief in ${language}.`,
    ...(reviewer === ReviewerRole.JUDGE && candidateCount > 1
      ? [
          `Compare all ${String(candidateCount)} candidate drafts. Choose the strongest evidence-grounded candidate with selectedCandidateIndex, then score and review that selected draft. The author preference percentage is advisory; you make the final selection.`,
        ]
      : []),
    `Return only one JSON object shaped ${REVIEW_REPLY_SHAPE} with no code fences. Keep the JSON keys exactly as shown. Do not include chain-of-thought.`,
  ].join(' ');
}
