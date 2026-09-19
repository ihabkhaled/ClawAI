/**
 * How answers are rendered into documents (F3, ADR-107).
 */

/** Links keep their target only for these schemes; anything else stays plain text. */
export const ALLOWED_LINK_PROTOCOLS: readonly string[] = ['http:', 'https:', 'mailto:'];

/** A fenced code block's language, as passed to a highlighter. */
export const CODE_LANGUAGE_PATTERN = /^[A-Za-z0-9+#.-]{1,24}$/u;

/** Letters of right-to-left scripts: Hebrew, Arabic, Syriac, Thaana and their forms. */
export const RTL_LETTER = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u;

/** Any other letter. The first strong letter decides a paragraph's direction. */
export const LTR_LETTER = /\p{L}/u;

export const MAX_HEADING_LEVEL = 6;

/** Title used when the answer has no heading and the caller gave none. */
export const DEFAULT_DOCUMENT_TITLE = 'Document';

/**
 * Body fonts, in fallback order. The Noto families ship in the service image
 * (fonts-noto-core, fonts-noto-cjk) and cover all 13 app locales. The Windows
 * families let the same renderer run in local tests.
 */
export const DOCUMENT_BODY_FONTS: readonly string[] = [
  'Noto Sans',
  'Noto Sans Arabic',
  'Noto Sans Hebrew',
  'Noto Sans Devanagari',
  'Noto Sans Thai',
  'Noto Sans CJK SC',
  'Noto Sans CJK JP',
  'Segoe UI',
  'Arial',
  'Nirmala UI',
  'Leelawadee UI',
  'Microsoft YaHei',
  'Yu Gothic',
];

export const DOCUMENT_MONO_FONTS: readonly string[] = [
  'DejaVu Sans Mono',
  'Noto Sans Mono',
  'Consolas',
];

/** Directories searched for fonts; missing ones are skipped. */
export const TYPST_FONT_DIRECTORIES: readonly string[] = ['/usr/share/fonts', 'C:/Windows/Fonts'];

/** Word's fonts. Word shapes and orders RTL text itself. */
export const DOCX_BODY_FONT = 'Calibri';
export const DOCX_MONO_FONT = 'Consolas';
export const DOCX_CODE_SHADING = 'F2F2F2';
export const DOCX_TABLE_HEADER_SHADING = 'E7E6E6';
/** Half-points: 22 = 11 pt. */
export const DOCX_BODY_SIZE = 22;
export const DOCX_NUMBERING_REFERENCE = 'claw-numbered';
