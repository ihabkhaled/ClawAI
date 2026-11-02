import {
  TRANSLATION_BODY_MARKER,
  TRANSLATION_LANGUAGE_NAMES,
  TRANSLATION_TITLE_MARKER,
} from '../constants/publication-translation.constants';
import type { Locale } from '@claw/shared-types';

/** The first chunk also carries the title, so one call returns both. */
export function buildTranslationPrompt(input: {
  from: Locale;
  to: Locale;
  chunk: string;
  title: string | null;
}): string {
  const header = `Translate from ${TRANSLATION_LANGUAGE_NAMES[input.from]} to ${TRANSLATION_LANGUAGE_NAMES[input.to]}.`;
  if (input.title === null) {
    return `${header}\nReply with the translated text only.\n\n${input.chunk}`;
  }
  return [
    header,
    `Reply in exactly this shape: a line "${TRANSLATION_TITLE_MARKER}", the translated title, a line "${TRANSLATION_BODY_MARKER}", then the translated text.`,
    '',
    TRANSLATION_TITLE_MARKER,
    input.title,
    '',
    TRANSLATION_BODY_MARKER,
    input.chunk,
  ].join('\n');
}
