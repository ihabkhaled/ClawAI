/** A table of contents is shown only for an article with at least this many headings. */
export const THREAD_TOC_MIN_HEADINGS = 3;
/** Deepest heading level listed (H2 and H3; H1 is the page title). */
export const THREAD_TOC_MAX_LEVEL = 3;
/** The longest anchor id; longer headings are cut (per code point). */
export const THREAD_HEADING_ID_MAX = 80;
export const THREAD_HEADING_ID_FALLBACK = 'section';
/** An article is stored up to 100,000 characters; nothing past it is rendered. */
export const THREAD_ARTICLE_MAX_RENDER_CHARS = 100_000;

/** Reading speed: words per minute for spaced scripts, characters per minute for the rest. */
export const THREAD_READING_WORDS_PER_MINUTE = 220;
export const THREAD_READING_CHARACTERS_PER_MINUTE = 450;
export const THREAD_UNSPACED_LOCALES: readonly string[] = ['ja', 'zh', 'th'];

export const THREAD_COPIED_RESET_MS = 2_000;

export enum ThreadCalloutKind {
  Note = 'note',
  Tip = 'tip',
  Warning = 'warning',
}

/**
 * The label word an article writes in front of a callout (`> **Note:** ...`) in each Thread language.
 * Matching is case-insensitive after NFKC. An unknown word still renders as a plain Note callout.
 */
export const THREAD_CALLOUT_WORDS: Readonly<Record<ThreadCalloutKind, readonly string[]>> = {
  [ThreadCalloutKind.Note]: [
    'note',
    'ملاحظة',
    'hinweis',
    'nota',
    'نکته',
    'توجه',
    'remarque',
    'नोट',
    'ध्यान दें',
    '注記',
    '注',
    'メモ',
    'примечание',
    'หมายเหตุ',
    '说明',
    '备注',
    '注释',
    'observação',
  ],
  [ThreadCalloutKind.Tip]: [
    'tip',
    'نصيحة',
    'tipp',
    'consejo',
    'توصیه',
    'astuce',
    'conseil',
    'सुझाव',
    'टिप',
    'suggerimento',
    'consiglio',
    'ヒント',
    'dica',
    'совет',
    'เคล็ดลับ',
    '提示',
    '小贴士',
    '技巧',
  ],
  [ThreadCalloutKind.Warning]: [
    'warning',
    'تحذير',
    'warnung',
    'advertencia',
    'aviso',
    'هشدار',
    'avertissement',
    'attention',
    'चेतावनी',
    'avviso',
    'attenzione',
    '警告',
    '注意',
    'atenção',
    'предупреждение',
    'внимание',
    'คำเตือน',
    '警示',
  ],
};
