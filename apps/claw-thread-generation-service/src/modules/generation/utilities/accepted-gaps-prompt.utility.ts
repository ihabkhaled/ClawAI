import { Locale } from '@claw/shared-types';

import {
  AUTHOR_GAPS_RULES,
  LIMITATIONS_HEADINGS,
  REVIEW_GAPS_RUBRIC,
} from '../constants/accepted-gaps.constants';

/**
 * The authors' rule for owner-accepted gaps: a limitations section, one plain item per gap, the
 * exact heading for the article language (the post-check looks for it), nothing invented.
 */
export function authorGapsNote(
  accepted: readonly string[],
  locale: Locale,
  language: string,
): string {
  const heading = LIMITATIONS_HEADINGS.get(locale) ?? LIMITATIONS_HEADINGS.get(Locale.EN) ?? '';
  return [
    `The owner accepted that these requirements cannot be met from the available evidence: ${JSON.stringify(accepted)}.`,
    `Add an H2 section headed exactly "${heading}" before the final "Sources" list, with one bullet for each accepted item stating plainly in ${language} what could not be found or verified.`,
    AUTHOR_GAPS_RULES,
  ].join(' ');
}

/** The Judge's and the Critic's rubric note for owner-accepted gaps. */
export function reviewGapsNote(accepted: readonly string[]): string {
  return `The owner accepted that these requirements cannot be met from the available evidence: ${JSON.stringify(accepted)}. ${REVIEW_GAPS_RUBRIC}`;
}
