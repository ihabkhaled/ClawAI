/** Step code of the single targeted research pass a failed review may trigger (ADR-193). */
export const EVIDENCE_GAP_RESEARCH_CODE = 'EVIDENCE_GAP_RESEARCH';
/** The pass found and merged new evidence items. */
export const EVIDENCE_GAP_FOUND_CODE = 'EVIDENCE_GAP_RESEARCH_DONE';
/** The pass ran but found nothing new, so the round continues with the bundle it had. */
export const EVIDENCE_GAP_EMPTY_CODE = 'EVIDENCE_GAP_RESEARCH_EMPTY';
/** The research call failed; the job goes on without it. */
export const EVIDENCE_GAP_FAILED_CODE = 'EVIDENCE_GAP_RESEARCH_FAILED';
/** The job had already spent too much of its cap for another research call. */
export const EVIDENCE_GAP_SPEND_CODE = 'EVIDENCE_GAP_RESEARCH_SPEND_CAP';
/** Step codes of a review that failed on its blockers while the score met the minimum. */
export const JUDGE_BLOCKED_CODE = 'JUDGE_BLOCKED';
export const CRITIC_BLOCKED_CODE = 'CRITIC_BLOCKED';
/** Added to the next round's revision brief so the authors cite the new sources. */
export const EVIDENCE_GAP_BRIEF_NOTE =
  'New evidence items were added to researchEvidence for the sourcing blockers. Cite them where they support the claims; ids: ';

/** Machine code the classifier maps to the EVIDENCE_GAP failure class; never stored in a step. */
export const EVIDENCE_GAP_CODE = 'EVIDENCE_GAP';

/** Targeted research passes one job attempt may run. */
export const EVIDENCE_GAP_MAX_PASSES_PER_ATTEMPT = 1;
/** New evidence items one targeted pass may add to the bundle. */
export const EVIDENCE_GAP_MAX_NEW_ITEMS = 10;
/** Items the bundle may hold after a merge. */
export const EVIDENCE_BUNDLE_MAX_ITEMS = 30;
/**
 * Serialized bundle size after a merge; an item that would pass it is left out. The bundle goes
 * into every role's prompt next to the source and the drafts and cannot be shrunk, so it stays
 * under half of chat-service's 200,000-character userPrompt limit (a 400k cap sent every model a
 * 400 on the production Thread, 2026-10-28).
 */
export const EVIDENCE_BUNDLE_MAX_CHARS = 100_000;

/** Longest research intent built from the topic and the blockers. */
export const EVIDENCE_GAP_QUERY_MAX_CHARS = 700;
export const EVIDENCE_GAP_QUERY_TOPIC_CHARS = 300;
export const EVIDENCE_GAP_QUERY_BLOCKER_CHARS = 200;
export const EVIDENCE_GAP_QUERY_MAX_BLOCKERS = 3;
export const EVIDENCE_GAP_QUERY_LEAD = 'Find independent primary sources for: ';

/** Blockers kept in a review step excerpt, and the length of each (the column holds 1200). */
export const VERDICT_MAX_BLOCKERS = 3;
export const VERDICT_BLOCKER_MAX_CHARS = 280;
export const VERDICT_EXCERPT_MAX_CHARS = 1200;

/** Hosts a cited source may never be: loopback, link-local and cloud metadata addresses. */
export const UNCITABLE_HOSTS: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  '169.254.169.254',
  'metadata.google.internal',
]);
export const UNCITABLE_HOST_SUFFIXES: readonly string[] = ['.local', '.internal', '.localhost'];
export const PRIVATE_IPV4_PATTERN = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/u;

/**
 * Words that mark a blocker as a missing-evidence request (sources, citations, verification),
 * folded to lower case with Arabic-script variants unified. A blocker about style, structure or
 * a contradiction contains none of them, so it never triggers research.
 */
export const EVIDENCE_GAP_TERMS: readonly string[] = [
  // English
  'source',
  'sources',
  'cite ',
  'citation',
  'cited',
  'citing',
  'primary source',
  'not in the evidence',
  'no evidence',
  'lacks evidence',
  'lack of evidence',
  'unverified',
  'cannot be verified',
  'can not be verified',
  'could not be verified',
  'unable to verify',
  'not verifiable',
  'unsupported claim',
  'unsubstantiated',
  'no supporting',
  'repository files',
  'bibliograph',
  // Arabic
  'مصدر',
  'مصادر',
  'استشهاد',
  'الاستشهاد',
  'توثيق',
  'غير موثق',
  'غير موثّق',
  'لا يمكن التحقق',
  'يتعذر التحقق',
  'للتحقق',
  'غير مدعوم',
  'غير مثبت',
  'ادله',
  'دليل',
  'مراجع',
  // Persian
  'منبع',
  'منابع',
  'ارجاع',
  'استناد',
  'مستند',
  'قابل تایید',
  'قابل بررسی نیست',
  'تایید نشده',
  'راستی ازمایی',
  'راستی‌ازمایی',
  'شواهد',
  'مدرک',
  // Japanese
  '出典',
  '引用',
  '一次資料',
  '一次情報',
  '根拠',
  '裏付け',
  '検証できない',
  '確認できない',
  '参考文献',
  // Chinese
  '来源',
  '來源',
  '出处',
  '出處',
  '引用',
  '一手资料',
  '一手資料',
  '无法验证',
  '無法驗證',
  '未经验证',
  '未經驗證',
  '证据',
  '證據',
  '参考文献',
  // German
  'quelle',
  'quellen',
  'beleg',
  'belege',
  'unbelegt',
  'nicht belegt',
  'nachweis',
  'zitier',
  'primärquelle',
  'nicht überprüf',
  'nicht verifizier',
  'nicht nachprüf',
  // Spanish
  'fuente',
  'fuentes',
  'cita ',
  'citas',
  'no se puede verificar',
  'sin verificar',
  'sin evidencia',
  // French
  'sources',
  'citer',
  'citation',
  'non vérifi',
  'impossible à vérifier',
  'preuve',
  // Italian
  'fonte',
  'fonti',
  'citare',
  'non verificabil',
  'prove',
  // Portuguese
  'fontes',
  'citar',
  'não verific',
  'não é possível verificar',
  // Russian
  'источник',
  'ссылк',
  'подтвержд',
  'не проверен',
  'невозможно проверить',
  // Hindi
  'स्रोत',
  'सूत्र',
  'सत्यापित',
  'प्रमाण',
  // Thai
  'แหล่งที่มา',
  'แหล่งอ้างอิง',
  'อ้างอิง',
  'ตรวจสอบไม่ได้',
  'หลักฐาน',
];

/** Characters dropped before matching: Arabic marks, tatweel and zero-width or direction marks. */
export const MATCH_IGNORED_CHARS_PATTERN =
  /[\u064B-\u065F\u0670\u0640\u200B-\u200F\u202A-\u202E]/gu;

/** Arabic-script letter variants folded to one form before matching. */
export const ARABIC_SCRIPT_FOLDS: ReadonlyMap<string, string> = new Map([
  ['\u0623', '\u0627'],
  ['\u0625', '\u0627'],
  ['\u0622', '\u0627'],
  ['\u0649', '\u06CC'],
  ['\u064A', '\u06CC'],
  ['\u0643', '\u06A9'],
  ['\u0629', '\u0647'],
]);
export const LATIN_LETTER_PATTERN = /\p{Script=Latin}/u;
export const ANY_LETTER_PATTERN = /\p{L}/u;
export const WHITESPACE_RUN_PATTERN = /\s+/gu;
export const LAST_CONTROL_CODE = 31;
export const DELETE_CODE = 127;

/** Review step roles a verdict is read from. */
export const REVIEW_STEP_ROLE_KINDS: ReadonlyMap<string, 'JUDGE' | 'CRITIC'> = new Map([
  ['JUDGE', 'JUDGE'],
  ['CRITIC', 'CRITIC'],
]);
