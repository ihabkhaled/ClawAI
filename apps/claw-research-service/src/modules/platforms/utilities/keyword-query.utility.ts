import {
  PLATFORM_KEYWORD_QUERY_MAX_TERMS,
  PLATFORM_KEYWORD_STOPWORDS,
} from '../constants/platform-api.constants';

/** A word, keeping the characters code names use (`c++`, `c#`, `node.js`, `async-await`). */
const WORD = /[\p{L}\p{N}\p{M}][\p{L}\p{N}\p{M}+#.-]*/gu;
const BARE_YEAR = /^(?:19|20)\d{2}$/u;

/** The first keywords of a query, for APIs that require every word to match; the query itself when none remain. */
export function toKeywordQuery(query: string, maxTerms = PLATFORM_KEYWORD_QUERY_MAX_TERMS): string {
  const terms = (query.match(WORD) ?? [])
    .map((term) => term.replace(/[.-]+$/u, ''))
    .filter(
      (term) =>
        term.length > 0 &&
        !BARE_YEAR.test(term) &&
        !PLATFORM_KEYWORD_STOPWORDS.has(term.toLowerCase()),
    )
    .slice(0, maxTerms);
  return terms.length === 0 ? query : terms.join(' ');
}
