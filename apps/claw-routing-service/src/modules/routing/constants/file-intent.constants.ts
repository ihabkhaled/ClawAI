/**
 * File-generation intent (F0, 2026-09-19).
 *
 * The old rule matched any verb substring plus any format substring, so
 * "can you re-write normally text for google docs, not in markdown" matched
 * "write" + "markdown" and was sent to file generation, which then failed.
 * Now: whole words only; a negated format ("not in markdown", "no pdf") does
 * not count; and a SOFT word (markdown, docs, report...) needs a STRONG
 * artifact word or a delivery verb next to it.
 *
 * F6 (2026-09-24, QA round on the "AI doesn't generate files" report): the
 * verb/negation/phrase lists were English-only, and the word tokenizer
 * (`file-intent.utility.ts`) matched only `[a-z0-9'.-]`, which drops every
 * non-Latin character. A message like "اعمل لي ملف PDF عن فوائد النوم" (make
 * me a PDF file about the benefits of sleep) kept the literal "pdf" in the
 * token stream but the Arabic verb "اعمل" (make) was invisible to `has()`,
 * so the message needed an English create/delivery verb to route to file
 * generation — it never had one. Every one of the app's 13 UI locales now
 * has its own create/delivery verbs here, and the tokenizer is Unicode-aware
 * (rules/20-i18n-and-user-facing-messages.md's locale list).
 */

/**
 * Words that on their own mean "give me a file". Format acronyms (pdf,
 * xlsx...) are typed in Latin script even inside a non-English message (see
 * the F6 tests), except a colloquial transliterated loanword like Arabic
 * "اكسل" for Excel — a handful of the most common of those are listed too.
 * This is not an exhaustive lexicon: a translated *name* of a format that
 * is not a common loanword ("جدول بيانات" for spreadsheet) still needs a
 * create/delivery verb next to it, same as the English soft words.
 */
export const FILE_INTENT_STRONG_WORDS: readonly string[] = [
  'file',
  'files',
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'csv',
  'zip',
  'spreadsheet',
  'excel',
  'powerpoint',
  'slides',
  'deck',
  'presentation',
  'downloadable',
  'attachment',
  // F6 (2026-09-24): a format name that is ONLY a format name is strong.
  // `txt`, `doc` and `document` qualify ("write a word document", "give me a
  // txt file"). Names that are also ordinary words or formatting/coding
  // requests stay SOFT (see below): "write a word that rhymes", "write it in
  // markdown", "write html for a button", "write docs for this API" and
  // "write a json schema" are chat answers, not downloads.
  'txt',
  'document',
  'doc',
  // The word "file" in each of the 13 UI locales, as strong as English "file"
  // ("اعمل لي ملف markdown" = "make me a markdown file").
  'ملف',
  'ملفات',
  'الملف',
  'فایل',
  'datei',
  'archivo',
  'fichier',
  'फ़ाइल',
  'फाइल',
  'ファイル',
  'arquivo',
  'файл',
  'ไฟล์',
  '文件',
  // ar: document, presentation ("عرض تقديمي"), and format loanwords
  'مستند',
  'تقديمي',
  'شرائح',
  'اكسل',
  'إكسل',
  'وورد',
  'بوربوينت',
  // es / it / pt loanword spelling of "document"
  'documento',
];

/**
 * Format acronyms that ask for a file even as a bare first word, with no
 * verb: "pdf: a guide to sleep", "xlsx budget tracker", "csv of 5 planets".
 * Only acronyms no one opens a chat question with — not zip ("zip codes"),
 * html ("html: how do I…") or json ("json vs yaml").
 */
export const FILE_INTENT_LEADING_FORMAT_WORDS: readonly string[] = [
  'pdf',
  'docx',
  'xlsx',
  'xls',
  'pptx',
  'csv',
];

/**
 * "<format> file with/of/for…" opening a message describes the file's
 * content ("json file with 3 users"), which a bug report ("json file parsing
 * error") does not. Live 2026-09-25: 8/8 models answered the former in chat.
 */
export const FILE_INTENT_LEADING_NAMED_FILE: {
  readonly formats: readonly string[];
  readonly files: readonly string[];
  readonly contentWords: readonly string[];
} = {
  formats: ['json', 'html', 'md', 'markdown', 'txt', 'text', 'zip', 'word', 'excel'],
  files: ['file', 'files'],
  contentWords: ['with', 'of', 'for', 'containing', 'listing', 'about'],
};

/** Formats that only mean a file when a strong word or delivery verb is present. */
export const FILE_INTENT_SOFT_WORDS: readonly string[] = [
  'markdown',
  'md',
  'json',
  'html',
  'docs',
  'word',
  'text',
  'report',
  'memo',
  'proposal',
  'brief',
  'one-pager',
  // ar: memo, report — as ambiguous as their English twins
  'مذكرة',
  'تقرير',
];

/**
 * Verbs that ask for delivery of an artifact, not for prose, one language at
 * a time (en, ar, de, es, fa, fr, hi, it, ja, pt, ru, th, zh — the 13 UI
 * locales). Each entry is deliberately a common, unambiguous imperative form;
 * this is intent detection, not a translation surface, so it does not need
 * every conjugation.
 */
export const FILE_INTENT_DELIVERY_VERBS: readonly string[] = [
  // en
  'download',
  'export',
  'attach',
  'save',
  // ar
  'حمل',
  'حمّل',
  'نزل',
  'صدر',
  'صدّر',
  'احفظ',
  'احفظه',
  // de
  'herunterladen',
  'exportiere',
  'exportieren',
  'speichere',
  'speichern',
  // es
  'descarga',
  'descargar',
  'exporta',
  'exportar',
  'guarda',
  'guardar',
  // fa
  'دانلود',
  'ذخیره',
  // fr
  'télécharge',
  'télécharger',
  'exporte',
  'exporter',
  'enregistre',
  'enregistrer',
  // hi ('has' below checks single tokens, so multi-word phrases never match)
  'डाउनलोड',
  'सेव',
  // it
  'scarica',
  'scaricare',
  'esporta',
  'esportare',
  'salva',
  'salvare',
  // ja (see the create-verb comment on stems vs. conjugated forms)
  'ダウンロード',
  '保存',
  // pt
  'baixe',
  'baixar',
  'exporte',
  'exportar',
  'salve',
  'salvar',
  // ru
  'скачай',
  'скачать',
  'экспортируй',
  'сохрани',
  'сохранить',
  // th
  'ดาวน์โหลด',
  'บันทึก',
  // zh
  '下载',
  '导出',
  '保存',
];

/**
 * Verbs that make an artifact when paired with a strong word, across all 13
 * UI locales (see the module comment).
 */
export const FILE_INTENT_CREATE_VERBS: readonly string[] = [
  // en
  'generate',
  'create',
  'make',
  'write',
  'produce',
  'build',
  'give',
  'prepare',
  'convert',
  'turn',
  'compile',
  'package',
  'zip',
  'bundle',
  // ar
  'اعمل',
  'اعملي',
  'اصنع',
  'أنشئ',
  'انشئ',
  'اكتب',
  'جهز',
  'جهّز',
  'اعطني',
  'أعطني',
  'هات',
  // de
  'erstelle',
  'erstellen',
  'mach',
  'mache',
  'machen',
  'generiere',
  'generieren',
  'schreibe',
  'schreiben',
  'gib',
  // es
  'crea',
  'crear',
  'genera',
  'generar',
  'haz',
  'hazme',
  'escribe',
  'escribir',
  'dame',
  // fa
  'بساز',
  'ایجاد',
  'بنویس',
  'بده',
  // fr
  'crée',
  'créer',
  'génère',
  'générer',
  'fais',
  'fais-moi',
  'écris',
  'écrire',
  'donne',
  'donne-moi',
  // hi
  'बनाओ',
  'बनाइए',
  'बना',
  'लिखो',
  'दो',
  // it
  'crea',
  'creare',
  'genera',
  'generare',
  'fai',
  'scrivi',
  'scrivere',
  'dammi',
  // ja — the ICU word segmenter splits conjugated verbs at the stem
  // (書いて → 書/い/て), so these are stems, not full conjugated forms.
  '作成',
  '作',
  '書',
  // pt
  'crie',
  'criar',
  'gere',
  'gerar',
  'faça',
  'escreva',
  'escrever',
  'dê',
  // ru
  'создай',
  'создать',
  'сделай',
  'сделать',
  'напиши',
  'написать',
  'дай',
  // th
  'สร้าง',
  'ทำ',
  'เขียน',
  // zh — single characters: the ICU segmenter tokenizes "做一个"/"写一个"/
  // "给我" as separate 做/一个, 写/一个, 给/我, so the compound never matches.
  '生成',
  '创建',
  '做',
  '写',
  '给',
];

/** Phrases that are a file request on their own. */
export const FILE_INTENT_PHRASES: readonly string[] = [
  'export as',
  'export to',
  'save as',
  'download as',
  'save to file',
  'write to file',
  'as a file',
  'as file',
  'into a file',
];

/**
 * Negations that cancel the format word that follows them within 3 words,
 * across the 13 UI locales (F6, 2026-09-24).
 */
export const FILE_INTENT_NEGATIONS: readonly string[] = [
  // en
  'not',
  'no',
  'without',
  "don't",
  'dont',
  'never',
  'instead of',
  // ar
  'لا',
  'بدون',
  'مش',
  // de
  'nicht',
  'ohne',
  'kein',
  // es / it
  'sin',
  'senza',
  // fa
  'بدون',
  'نه',
  // fr
  'pas',
  'sans',
  // hi
  'नहीं',
  // ja
  'いらない',
  // pt
  'sem',
  // ru
  'без',
  // th
  'ไม่',
  // zh
  '不',
  '不要',
  '别',
];

export const FILE_INTENT_NEGATION_WINDOW = 3;

/** File extensions typed literally (".pdf", "report.docx"). */
export const FILE_INTENT_EXTENSION =
  /\.(pdf|docx?|xlsx?|pptx?|csv|md|txt|json|html?|zip|py|ts|js|sql)\b/u;

/**
 * A how/what/why question asks for knowledge, not a file ("how do I convert
 * a doc to pdf?"), unless it asks for something FOR the user ("can you make
 * me a pdf").
 */
export const FILE_INTENT_QUESTION =
  /^\s*(how (do|can|to|does)|what|why|which|is|are|does|should|when)\b/u;
export const FILE_INTENT_FOR_ME = /\b(for me|give me|make me|send me|create me|generate me)\b/u;
