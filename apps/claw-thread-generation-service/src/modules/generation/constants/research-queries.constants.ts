/**
 * Research queries (ADR-195). One long topic sent as one search query returns unrelated pages and
 * the evidence-gap pass used to cut the topic after 300 characters, so a source hint at the end of
 * the topic was lost. Both passes now send several SHORT targeted queries built from the topic.
 */

/** Queries one research pass may send. */
export const RESEARCH_QUERIES_MAX = 6;
/** Longest single query, in characters. */
export const RESEARCH_QUERY_MAX_CHARS = 160;
/** Longest query text written to the step log. */
export const RESEARCH_QUERY_LOG_CHARS = 80;
/** Queries of one pass that run at the same time. */
export const RESEARCH_QUERY_CONCURRENCY = 4;
/** A topic this short with no source hint stays one query, as it always was. */
export const RESEARCH_SHORT_TOPIC_CHARS = 160;
/** Source-hint queries (arXiv id, DOI, quoted title, author and year) in one pass. */
export const RESEARCH_HINT_QUERIES_MAX = 4;
/** Hint queries the evidence-gap pass keeps, so its blocker queries still fit the cap. */
export const RESEARCH_GAP_HINT_QUERIES_MAX = 3;
/** Evidence-gap blockers that each become a query. */
export const RESEARCH_BLOCKER_QUERIES_MAX = 3;
/** Key terms in one keyword query, and in one query built from a blocker. */
export const RESEARCH_KEYWORDS_MAX = 6;
/** Shortest key term, per kind of script (characters). */
export const RESEARCH_KEYWORD_MIN_CHARS = 5;
export const RESEARCH_KEYWORD_MIN_CHARS_ARABIC = 3;
export const RESEARCH_KEYWORD_MIN_CHARS_UNSPACED = 2;
/** Key terms of the topic's subject that precede a blocker's key terms in an evidence-gap query. */
export const RESEARCH_GAP_SUBJECT_TERMS = 4;
/** Text kept after an author-and-year hint, so the query says what the work was about. */
export const RESEARCH_HINT_TRAIL_CHARS = 90;
/** Window before an identifier (arXiv id, DOI) that is kept as the words describing it. */
export const RESEARCH_HINT_WINDOW_CHARS = 140;

/** Step codes: one query's result count, a query that failed, a query skipped for the spend cap. */
export const RESEARCH_QUERY_CODE = 'RESEARCH_QUERY';
export const RESEARCH_QUERY_FAILED_CODE = 'RESEARCH_QUERY_FAILED';
export const RESEARCH_QUERY_SPEND_CODE = 'RESEARCH_QUERY_SPEND_CAP';

/** Patterns that find a source hint inside a topic, in any language. */
export const SEGMENT_SPLIT_PATTERN = /[;；؛\n\r。]+/u;
export const ARXIV_ID_PATTERN = /(?<![\d.])\d{2}(?:0[1-9]|1[0-2])\.\d{4}\d?(?!\d)/gu;
export const DOI_PATTERN = /\b10\.\d+\/[^\s"'<>()[\]]+/gu;
export const QUOTED_TITLE_PATTERN = /["“„«「『]([^"“”»」』\n]+)["”»」』]/gu;
/** A quoted run is a title when its length is in this range. */
export const QUOTED_TITLE_MIN_CHARS = 12;
export const QUOTED_TITLE_MAX_CHARS = 120;
export const YEAR_PATTERN = /(?<!\d)(?:19|20)\d{2}(?!\d)/gu;
/** Text kept before a year when looking for the author name, and the most name words taken. */
export const AUTHOR_LOOKBACK_CHARS = 48;
export const AUTHOR_NAME_WORDS_MAX = 4;
export const OPEN_BRACKETS = '(（[';
export const CLOSING_BRACKETS = ')）]';
export const TRAILING_DOI_CHARS = '.,;:';
export const TRAILING_REPOSITORY_CHARS = '.-';
export const UPPER_LATIN_WORD_PATTERN = /\b\p{Lu}[a-z'’-]{2,}/u;
/** "et al." and its equivalents; an author-and-year hint needs a Latin name or one of these. */
export const ET_AL_MARKERS: readonly string[] = [
  'et al',
  'وآخرون',
  'و آخرون',
  'ほか',
  'ら',
  '等',
  '等人',
  'и др',
  'y col',
  'et coll',
  'und andere',
  'u. a.',
];
export const GITHUB_URL_PATTERN = /github\.com\/([\w.-]{1,39})\/([\w.-]{1,100})/giu;
export const REPOSITORY_NAME_PATTERN =
  /(?:\brepo(?:sitory)?|\bgithub|مستودع|リポジトリ|\bRepository)\s*:?\s+([\w.-]{1,39}\/[\w.-]{1,100})/giu;
export const SENTENCE_END_PATTERN = /[。！？]|[.!?؟]\s|\n/u;
export const HIRAGANA_ONLY_PATTERN = /^\p{Script=Hiragana}+$/u;
export const LABEL_PATTERN = /^[^:：]{3,40}[:：]\s*/u;
export const WORD_TRIM_CHARS = '.,;:!?()[]"\'';

/**
 * Task words that appear in nearly every Threads brief and say nothing about the subject; they are
 * never key terms. Folded to lower case.
 */
export const RESEARCH_GENERIC_WORDS: ReadonlySet<string> = new Set([
  // English
  'research',
  'article',
  'publication',
  'prepare',
  'topic',
  'state',
  'define',
  'specify',
  'include',
  'separate',
  'claims',
  'results',
  'sources',
  'source',
  'primary',
  'cite',
  'cited',
  'question',
  'neutral',
  'exploratory',
  'distinguishes',
  'avoids',
  'whether',
  'between',
  'should',
  'without',
  'fabricate',
  'label',
  'study',
  'proposed',
  'analysis',
  'plan',
  'limitations',
  'details',
  'verify',
  'verified',
  'found',
  'hints',
  'search',
  'available',
  'files',
  'descriptions',
  'arxiv',
  'cannot',
  'against',
  'independent',
  'would',
  'their',
  'about',
  'which',
  'these',
  'those',
  'there',
  'where',
  'being',
  'claim',
  'draft',
  'cites',
  'states',
  'missing',
  'requested',
  'required',
  // German
  'forschung',
  'artikel',
  'quellen',
  'quelle',
  'belege',
  'beitrag',
  'thema',
  'primärquellen',
  'ergebnisse',
  'analyse',
  'studie',
  // Arabic
  'بحث',
  'مقال',
  'مقالة',
  'مصادر',
  'مصدر',
  'موضوع',
  'نتائج',
  'دراسة',
  'تحليل',
  'أولية',
  'البحث',
  'وآخرون',
  'قابلة',
  'قابل',
  // Japanese
  '研究',
  '記事',
  '出典',
  '情報源',
  '結果',
  '分析',
  '調査',
  '主要',
  '課題',
  '可能',
  // Spanish and French
  'artículo',
  'fuentes',
  'investigación',
  'recherche',
]);

/**
 * Hosts whose pages are the original of a paper, a standard or a repository. Items from them are
 * ranked first when a pass has more results than the bundle may hold.
 */
export const PRIMARY_SOURCE_HOSTS: readonly string[] = [
  'arxiv.org',
  'doi.org',
  'aclanthology.org',
  'openreview.net',
  'proceedings.mlr.press',
  'nature.com',
  'science.org',
  'ieee.org',
  'acm.org',
  'github.com',
];
