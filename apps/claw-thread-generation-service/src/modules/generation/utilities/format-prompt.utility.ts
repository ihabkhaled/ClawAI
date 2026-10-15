import type { Locale } from '@claw/shared-types';

import { FORMAT_REPLY_SHAPE, FORMAT_SYSTEM_RULES } from '../constants/format-prompt.constants';
import { describeContentLanguage } from './review-prompt.utility';

/** System prompt of the optional FORMAT stage. Layout only; the guard re-checks every promise. */
export function buildFormatSystemPrompt(locale: Locale): string {
  const language = describeContentLanguage(locale);
  return [
    ...FORMAT_SYSTEM_RULES,
    `The article language is ${language} (${locale}); keep it.`,
    `Return only one JSON object shaped ${FORMAT_REPLY_SHAPE} with the whole formatted article as the "markdown" string, no other keys and no code fences. Do not include analysis or hidden reasoning.`,
  ].join(' ');
}

export function buildFormatUserPrompt(markdown: string, citationUrls: readonly string[]): string {
  return `Article markdown:\n${markdown}\n\nUrls already cited (the only urls allowed in "Sources"):\n${citationUrls.join('\n')}`;
}
