import {
  CONTEXT_PAGE_LINK,
  LOCALE_LATIN_HINTS,
  LOCALE_SCRIPT_TESTS,
  MEMORY_PAGE_LINK,
  SAVE_CONFIRMATIONS,
  SAVE_PREVIEW_MAX_CHARS,
  SAVED_PACK_FALLBACK_NAME,
  SAVED_PACK_NAME_MAX_CHARS,
} from '../constants/save-to-context.constants';
import type { ConfirmationLocale, SaveToContextOutcome } from '../types/save-to-context.types';

/** The reply's language: the script of the user's command, then Latin word hints. */
export function detectConfirmationLocale(text: string): ConfirmationLocale {
  const head = text.slice(0, 400);
  for (const { locale, test } of LOCALE_SCRIPT_TESTS) {
    if (test.test(head)) return locale;
  }
  for (const { locale, test } of LOCALE_LATIN_HINTS) {
    if (test.test(head)) return locale;
  }
  return 'en';
}

/** One line, at most SAVE_PREVIEW_MAX_CHARS, for the confirmation. */
export function previewOf(content: string): string {
  const oneLine = content.replaceAll(/\s+/gu, ' ').trim();
  return oneLine.length <= SAVE_PREVIEW_MAX_CHARS
    ? oneLine
    : `${oneLine.slice(0, SAVE_PREVIEW_MAX_CHARS - 1)}…`;
}

/** A pack is named after its first markdown heading, else its first line. */
export function savedPackName(content: string): string {
  const lines = content.split('\n').map((line) => line.trim());
  const heading = lines.find((line) => /^#{1,6}\s+\S/u.test(line));
  const source = heading?.replace(/^#{1,6}\s+/u, '') ?? lines.find((line) => line.length > 0) ?? '';
  const name = source.replaceAll(/[*_`]/gu, '').trim().slice(0, SAVED_PACK_NAME_MAX_CHARS);
  return name.length > 0 ? name : SAVED_PACK_FALLBACK_NAME;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replaceAll(/\{(\w+)\}/gu, (whole, key: string) => values[key] ?? whole);
}

/** The assistant's reply to a "save this" turn, in the user's language. */
export function renderSaveConfirmation(
  outcome: SaveToContextOutcome,
  locale: ConfirmationLocale,
): string {
  const t = SAVE_CONFIRMATIONS[locale];
  const number = (value: number): string => new Intl.NumberFormat(locale).format(value);
  switch (outcome.kind) {
    case 'MEMORY': {
      return fill(t.memory, {
        type: t.types[outcome.memoryType],
        size: number(outcome.size),
        preview: outcome.preview,
        link: MEMORY_PAGE_LINK,
      });
    }
    case 'PACK': {
      return fill(t.pack, {
        name: outcome.name,
        size: number(outcome.size),
        link: CONTEXT_PAGE_LINK,
      });
    }
    case 'ASK': {
      return t.ask;
    }
    case 'FAILED': {
      return fill(t.failed, { reason: t.reasons[outcome.reason] });
    }
  }
}
