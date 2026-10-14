/**
 * Citation markers in an author draft: `[id]`, `[id1, id2]` and `[[id]]`, also written with the
 * full-width and CJK brackets that Arabic, Persian, Japanese and Chinese output often uses.
 */
export const CITATION_MARKER_PATTERN =
  /[[\uFF3B\u3010\u3014]{1,2}\s*([^[\]\uFF3B\uFF3D\u3010\u3011\u3014\u3015\n]{4,200}?)\s*[\]\uFF3D\u3011\u3015]{1,2}/gu;

/** Separators between ids in one marker: ASCII and Arabic commas and semicolons, CJK enumeration comma. */
export const CITATION_ID_SPLIT_PATTERN = /\s*[,;\u060C\u061B\uFF0C\uFF1B\u3001]\s*/u;

/** A marker made only of short numbers, `[1]` or `[1, 2]`. */
export const CITATION_NUMBER_MARKER_PATTERN = /\[([\d\s,;]{1,40})\]/gu;

/** A bare number a model used where an evidence id belongs. */
export const CITATION_ORDINAL_PATTERN = /^\d{1,3}$/u;

/** Query parameters that only track a visit; they are ignored when two urls are compared. */
export const TRACKING_PARAM_PATTERN = /^(?:utm_.+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src)$/iu;

/**
 * Marks that carry no text: zero-width characters, directional marks and isolates (an RTL
 * paragraph inserts them around Latin ids), the word joiner, the soft hyphen and the byte order mark.
 */
export const INVISIBLE_MARKS_PATTERN = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/gu;

/** Wrappers a model puts around a bare id: brackets of every width, quotes, backticks, parentheses. */
export const ID_WRAPPER_PATTERN =
  /^[\s[\](){}<>"'`\u201C\u201D\u2018\u2019\u00AB\u00BB]+|[\s[\](){}<>"'`\u201C\u201D\u2018\u2019\u00AB\u00BB]+$/gu;

/** Brackets other than ASCII ones, mapped to the ASCII bracket they stand for. */
export const BRACKET_FOLD: ReadonlyMap<string, string> = new Map([
  ['\uFF3B', '['],
  ['\uFF3D', ']'],
  ['\u3010', '['],
  ['\u3011', ']'],
  ['\u3014', '['],
  ['\u3015', ']'],
  ['\u300C', '['],
  ['\u300D', ']'],
  ['\u300E', '['],
  ['\u300F', ']'],
]);

/**
 * Code point of the digit zero of each decimal-digit block a model may write an evidence id in:
 * Arabic-Indic, Extended Arabic-Indic (Persian), Devanagari, Thai and full-width digits.
 * Evidence ids are hexadecimal, so a translated digit is a mangled id, never a number.
 */
export const DIGIT_BLOCK_ZEROS: readonly number[] = [0x660, 0x6f0, 0x966, 0xe50, 0xff10];
export const DIGIT_BLOCK_LENGTH = 10;

/** CJK brackets that NFKC does not fold, and any decimal digit of any script. */
export const CJK_BRACKET_PATTERN = /[【】〔〕「-』]/gu;
export const DECIMAL_DIGIT_PATTERN = /\p{Nd}/gu;
