/** Citation markers seen in published text: `[id]` in ASCII, full-width and CJK brackets. */
export const MARKER_RUN_CHARACTER = /[\s,、，;[\]［］【】〔〕\p{Cf}\p{Nd}a-fA-FＡ-Ｆａ-ｆ]/u;
export const MARKER_CLOSERS: ReadonlySet<string> = new Set([']', '］', '】', '〕']);
export const MARKER_OPENERS: ReadonlySet<string> = new Set(['[', '［', '【', '〔']);
export const MARKER_SEPARATOR = /[\s,、，;[\]［］【】〔〕]+/u;
/** An internal source id: 16 hex characters (after digits and width are folded). */
export const INTERNAL_ID = /^[0-9a-f]{16}$/u;
export const BARE_URL_START = /^https?:\/\//iu;
export const URL_MAX_CHARS = 2048;
/** Separators between the address and the evidence id inside one legacy bracket: ASCII, Arabic and CJK commas, semicolon. */
export const URL_ID_SEPARATORS: ReadonlySet<string> = new Set([',', '،', '，', '、', ';']);
