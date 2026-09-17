/**
 * A URL anywhere in the prompt means the user wants that page read.
 *
 * The only signal here that works in all thirteen locales, and the case the
 * manual-only flow handled worst: the link was ignored unless a fetch mode had
 * been selected first.
 */
export const AUTO_RESEARCH_FETCH_URL_PATTERN = /https?:\/\/[^\s<>"')]+/iu;

/** Phrases that mean "the answer depends on what is true right now". */
export const AUTO_RESEARCH_RECENCY_MARKERS: readonly string[] = [
  'latest',
  'today',
  'right now',
  'currently',
  'current price',
  'this week',
  'this month',
  'this year',
  'recent',
  'news',
  'breaking',
  'just released',
  'as of',
  'up to date',
  'up-to-date',
  'who won',
  'stock price',
  'release date',
];

/** Phrases where the user is asking for the web explicitly. */
export const AUTO_RESEARCH_REQUEST_MARKERS: readonly string[] = [
  'search the web',
  'search online',
  'look it up',
  'look this up',
  'google it',
  'find sources',
  'cite sources',
  'with sources',
  'browse',
];
