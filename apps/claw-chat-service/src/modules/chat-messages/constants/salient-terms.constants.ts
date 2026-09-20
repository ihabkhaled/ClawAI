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

/**
 * How many words a cross-thread search may use when there is no identifier.
 *
 * Words are ordered longest-first, which is a weak proxy for how discriminating
 * a word is and was measured wrong on the case this feature exists for. A
 * prompt asking for a canary cohort codename ranked `conversation`,
 * `containing`, `genuinely`, `operation`, `workspace` and `inventing` above
 * `cohort` and `canary` purely on length, so the six terms that reached the
 * database were the six that said nothing about the subject.
 *
 * Twelve, because the scan now takes one bounded slice per term and weights a
 * term that fills its own slice down to a floor. A common word costs one small
 * query and earns almost nothing, so including it is cheap and excluding the
 * rare word below it is not. Raising the cap is the fix; the proxy stays as the
 * tie-breaker it is good enough to be.
 */
export const SALIENT_SEARCH_WORD_LIMIT = 12;
