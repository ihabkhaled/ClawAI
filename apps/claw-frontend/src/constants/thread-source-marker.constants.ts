/**
 * Characters a source-marker bracket run can contain: brackets (ASCII, full-width and CJK),
 * commas (ASCII, full-width, ideographic), semicolons, whitespace, invisible format marks (RTL
 * marks), decimal digits of any script and hex letters (ASCII and full-width).
 */
export const THREAD_SOURCE_MARKER_RUN_CHARACTER =
  /[\s,、，;[\]［］【】〔〕\p{Cf}\p{Nd}a-fA-FＡ-Ｆａ-ｆ]/u;
export const THREAD_SOURCE_MARKER_OPENERS = new Set(['[', '［', '【', '〔']);
export const THREAD_SOURCE_MARKER_CLOSERS = new Set([']', '］', '】', '〕']);
export const THREAD_SOURCE_MARKER_SEPARATOR = /[\s,、，;[\]［］【】〔〕]+/u;
/** An internal source id: 16 hex characters (after digits and width are folded). */
export const THREAD_SOURCE_MARKER_ID = /^[0-9a-f]{16}$/u;
export const THREAD_SOURCE_MARKER_URL_START = /^https?:\/\//iu;
export const THREAD_SOURCE_MARKER_URL_MAX_CHARS = 2048;
/** Zero of each decimal-digit block: Arabic-Indic, Persian, Devanagari, Bengali, Tamil, Thai, full-width... */
export const THREAD_DIGIT_ZERO_BLOCKS: readonly number[] = [
  0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0e50,
  0x0ed0, 0x0f20, 0x1040, 0x17e0, 0x1810, 0xff10,
];
