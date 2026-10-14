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
/**
 * Version of the text format written to body_norm/title_norm/tsv. Bump it whenever normalisation changes;
 * the reconcile job re-indexes rows written with an older version.
 * 2: ja/zh/th words are segmented; citation markers are stripped.
 * 3: comma-separated and nested citation marker lists are stripped too.
 */
export const BOARD_DOC_FORMAT_VERSION = 3;
/** Rows re-indexed per tick for a format upgrade (bounded so a big table never stalls a tick). */
export const BOARD_REINDEX_BATCH_SIZE = 50;
/** Oldest rows inspected per tick for counter drift; unchanged ones are only touched, not rebuilt. */
export const BOARD_STALE_SCAN_SIZE = 500;
/** Wall-clock budget for the sync loops of one reconcile tick. */
export const BOARD_RECONCILE_TIME_BUDGET_MS = 20_000;
/**
 * Internal source markers such as [b9e5088333f64bee], doubled brackets, comma lists [id1, id2] and
 * nested lists [[id1], [id2]]; never shown or searched. A bracket run is a candidate only; it is
 * stripped when every token in it is a 16-hex id. The wide run (may span several brackets) goes first.
 */
export const BOARD_CITATION_NARROW_RUN = /\[{1,2}[\s,0-9a-f]+\]{1,2}/giu;
export const BOARD_CITATION_TOKEN_SEPARATOR = /[\s,[\]]+/u;
export const BOARD_CITATION_ID = /^[0-9a-f]{16}$/iu;
/** Runs of scripts written without spaces; segmented into words before indexing and querying. */
export const BOARD_UNSPACED_RUN = /[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}\p{scx=Thai}]+/gu;
export const BOARD_THAI_CHARACTER = /\p{Script=Thai}/u;
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
/** Word segmenters for unspaced scripts; the script, not the article locale, picks the dictionary. */
export const BOARD_UNSPACED_WORD_SEGMENTERS = {
  cjk: new Intl.Segmenter('ja', { granularity: 'word' }),
  thai: new Intl.Segmenter('th', { granularity: 'word' }),
} as const;
/** pg_trgm's default similarity threshold, and the trigram window. */
export const BOARD_FUZZY_MIN_SIMILARITY = 0.3;
export const BOARD_TRIGRAM_SIZE = 3;
export const BOARD_MIN_FUZZY_WORD_LENGTH = 3;
