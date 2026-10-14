import { Locale } from '@claw/shared-types';

/** Output ceiling of a role call; the role schema allows no more. */
export const OUTPUT_TOKENS_HARD_MAX = 32_768;

/** Growth of the output ceiling when the previous reply was cut off, at least. */
export const TRUNCATION_RETRY_MIN_FACTOR = 1.5;

/**
 * Tokens one word costs in each language relative to English. A cut-off reply is asked again with
 * at least this much more room, because the same article needs more tokens in these languages.
 */
export const LOCALE_TOKEN_FACTOR: ReadonlyMap<Locale, number> = new Map([
  [Locale.AR, 2],
  [Locale.FA, 2],
  [Locale.HI, 2.2],
  [Locale.TH, 2],
  [Locale.JA, 1.8],
  [Locale.ZH, 1.6],
  [Locale.RU, 1.7],
  [Locale.DE, 1.4],
  [Locale.ES, 1.3],
  [Locale.FR, 1.3],
  [Locale.IT, 1.3],
  [Locale.PT, 1.3],
]);

/**
 * Time one role may spend across all its candidates and format retries. Checked before every new
 * try (a call already in flight is bounded by its own silence and total limits), so a model that
 * keeps answering badly cannot hold a job for the whole attempt budget.
 */
export const ROLE_MAX_MS = 3 * 60_000;

/** Lead of the note appended when the previous reply was cut off by the output limit. */
export const TRUNCATION_NOTE =
  ' Your previous reply was cut off before the JSON object ended. Write a more compact article and finish the JSON object with every brace closed.';

/** Reasoning wrapped in tags by models that think before answering: closed block, closing tag, opening tag. */
export const REASONING_BLOCK_PATTERN =
  /<(think|thinking|thought|reasoning|reflection)\b[^>]*>[\s\S]*?<\/\1\s*>/giu;
export const REASONING_CLOSE_PATTERN = /<\/(?:think|thinking|thought|reasoning|reflection)\s*>/giu;
export const REASONING_OPEN_PATTERN = /<(?:think|thinking|thought|reasoning|reflection)\b[^>]*>/iu;
