import { z } from 'zod';

import {
  PublicationSafetyStatus,
  PublicationStatus,
  RevisionReviewStatus,
} from '../../../generated/prisma';

/** Normalised body characters kept per search row. */
export const BOARD_BODY_MAX_CHARS = 20_000;
export const BOARD_RECONCILE_INTERVAL_MS = 60_000;
export const BOARD_RECONCILE_BATCH_SIZE = 100;
/** A row not refreshed for this long is re-synced so reaction, comment and view counts stay fresh. */
export const BOARD_STALE_DOC_AGE_MS = 5 * 60_000;
/** Words per minute for space-separated scripts; CJK counts characters at the CJK rate. */
export const BOARD_WORDS_PER_MINUTE = 220;
export const BOARD_CJK_CHARS_PER_MINUTE = 400;
export const BOARD_DEFAULT_TEXT_SEARCH_CONFIG = 'simple';

/** Postgres text-search configurations that ship with the server; any other locale uses 'simple'. */
export const BOARD_TEXT_SEARCH_CONFIGS: Readonly<Record<string, string>> = {
  en: 'english',
  de: 'german',
  fr: 'french',
  es: 'spanish',
  it: 'italian',
  pt: 'portuguese',
  ru: 'russian',
  tr: 'turkish',
  nl: 'dutch',
};

export const BOARD_LATIN_OR_CYRILLIC = /[\p{Script=Latin}\p{Script=Cyrillic}]/u;
export const BOARD_COMBINING_MARK = /\p{M}/gu;
export const BOARD_ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/gu;
export const BOARD_CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;
export const BOARD_ARABIC_FOLD_PATTERN =
  /[\u0623\u0625\u0622\u0671\u0649\u0626\u06CC\u0624\u0629\u06A9]/gu;
export const BOARD_ARABIC_FOLDS: ReadonlyMap<string, string> = new Map([
  ['\u0623', '\u0627'],
  ['\u0625', '\u0627'],
  ['\u0622', '\u0627'],
  ['\u0671', '\u0627'],
  ['\u0649', '\u064A'],
  ['\u0626', '\u064A'],
  ['\u06CC', '\u064A'],
  ['\u0624', '\u0648'],
  ['\u0629', '\u0647'],
  ['\u06A9', '\u0643'],
]);
export const BOARD_CJK_CHARACTER =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
export const BOARD_TEXT_SEARCH_CONFIG_MAP: ReadonlyMap<string, string> = new Map(
  Object.entries(BOARD_TEXT_SEARCH_CONFIGS),
);
export const BOARD_RECONCILE_START_CURSOR = { updatedAt: new Date(0), id: '' } as const;
export const BOARD_CONTENT_SCHEMA = z.object({
  markdown: z.string(),
  citations: z.array(z.unknown()).default([]),
});
export const BOARD_VISIBLE_REVISION = {
  reviewStatus: RevisionReviewStatus.OWNER_APPROVED,
  safetyStatus: PublicationSafetyStatus.APPROVED,
  indexEligible: true,
} as const;
/** The same predicate the public discovery uses: PUBLISHED, owner approved, safety approved, index eligible. */
export const BOARD_VISIBLE_PUBLICATION = {
  status: PublicationStatus.PUBLISHED,
  revisions: { some: BOARD_VISIBLE_REVISION },
} as const;
