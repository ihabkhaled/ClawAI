/**
 * How many terms one cross-thread search may use.
 *
 * Each term becomes an `OR content ILIKE '%term%'` branch, so the count is a
 * direct cost on the database. Six is enough to carry an identifier plus the
 * distinguishing nouns of a sentence, and small enough that the query stays a
 * bounded scan of one user's recent rows.
 */
export const SALIENT_TERM_LIMIT = 6;

/**
 * Conversational filler — words that describe the sentence rather than its
 * subject.
 *
 * Deliberately narrow. Domain words stay in: removing "project" or "database"
 * would strip exactly the terms that make a search specific. Only words that
 * would match nearly every thread are listed.
 */
export const SALIENT_TERM_STOPWORDS: ReadonlySet<string> = new Set([
  'about',
  'again',
  'also',
  'answer',
  'been',
  'before',
  'being',
  'both',
  'could',
  'discussed',
  'does',
  'doing',
  'each',
  'earlier',
  'from',
  'give',
  'have',
  'here',
  'into',
  'just',
  'know',
  'like',
  'line',
  'made',
  'make',
  'many',
  'more',
  'most',
  'much',
  'need',
  'only',
  'other',
  'over',
  'please',
  'previous',
  'reply',
  'said',
  'same',
  'send',
  'should',
  'show',
  'some',
  'such',
  'take',
  'tell',
  'than',
  'that',
  'them',
  'then',
  'there',
  'these',
  'they',
  'thing',
  'this',
  'those',
  'used',
  'using',
  'very',
  'want',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'your',
]);
