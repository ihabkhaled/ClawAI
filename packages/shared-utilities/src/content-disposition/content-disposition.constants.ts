/**
 * What cannot go into the quoted ASCII `filename=`: anything outside printable
 * ASCII (Node refuses header bytes above 0xFF and throws, which became a 500),
 * plus the quote and backslash that would end or escape the quoted string.
 */
export const ASCII_FILENAME_UNSAFE = /[^\x20-\x7E]|["\\]/gu;

/** Accents NFKD splits off ("é" → "e" + U+0301), dropped from the fallback. */
export const COMBINING_MARKS = /[\u0300-\u036F]/gu;

/** The fallback name when a filename has no ASCII letter or digit at all. */
export const ASCII_FALLBACK_BASE = 'download';

/** RFC 5987 leaves these unescaped by encodeURIComponent but they must be encoded. */
export const RFC5987_EXTRA_ESCAPES = /['()*]/gu;
