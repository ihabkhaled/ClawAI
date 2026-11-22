/** The placeholder title a Thread stored before titles were derived from the text. */
export const UNTITLED_PLACEHOLDER = 'Untitled draft';
/**
 * `[https://example.com/a, efc2e342efd8b15e]`: an address and its evidence id inside one bracket,
 * read by `replaceLegacyMarkers`. A scan, not one global regex: CodeQL js/polynomial-redos flagged
 * `\[(https?:\/\/[^\s,;\]]+)[,;]\s*([0-9a-f]{8,32})\]`, because the address may contain `[`, so a
 * text of `[https://[https://...` was re-scanned to its end from every `[`.
 */
export const LEGACY_URL_SCHEME = /^https?:\/\//iu;
/** `https://` is the longest scheme `LEGACY_URL_SCHEME` matches. */
export const LEGACY_URL_SCHEME_MAX_CHARS = 8;
/** A character that ends the address: blank, `,`, `;` or `]`. */
export const LEGACY_URL_END_CHARACTER = /^[\s,;\]]$/u;
/** The address and the id are split by one of these. */
export const LEGACY_ID_SEPARATORS = ',;';
export const LEGACY_ID_MIN_CHARS = 8;
export const LEGACY_ID_MAX_CHARS = 32;
export const HEX_CHARACTER = /^[0-9a-f]$/iu;
export const BLANK_CHARACTER = /^\s$/u;
