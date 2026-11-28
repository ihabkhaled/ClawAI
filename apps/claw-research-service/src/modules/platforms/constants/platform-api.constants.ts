/**
 * Official-API platform adapters (research engine B3). Every request goes to a
 * host on this fixed list, checked before the request is sent and again on
 * every redirect hop. No secret and no contact address is ever sent.
 */
export const PLATFORM_API_FIXED_HOSTS: ReadonlySet<string> = new Set([
  'api.openalex.org',
  'api.semanticscholar.org',
  'eutils.ncbi.nlm.nih.gov',
  'api.crossref.org',
  'export.arxiv.org',
  'api.stackexchange.com',
  'hn.algolia.com',
  'api.github.com',
]);

/** Wikipedia language editions: `<2-3 lower-case letters>.wikipedia.org`, nothing else. */
export const PLATFORM_WIKIPEDIA_HOST_PATTERN = /^[a-z]{2,3}\.wikipedia\.org$/u;

/** Largest API response body read, in bytes. */
export const PLATFORM_API_MAX_BYTES = 1024 * 1024;
/** Redirect hops followed (each one allow-listed and SSRF-checked). */
export const PLATFORM_API_MAX_REDIRECTS = 2;
/** Longest snippet kept per result, in characters, after markup is stripped. */
export const PLATFORM_SNIPPET_MAX_CHARS = 1_000;
/** Longest raw text field ever scanned for markup (bounded work per field). */
export const PLATFORM_FIELD_MAX_CHARS = 20_000;
/** Most words rebuilt from an OpenAlex inverted abstract index. */
export const PLATFORM_OPENALEX_MAX_ABSTRACT_WORDS = 400;
/** Most results asked of any API in one call. */
export const PLATFORM_API_MAX_RESULTS = 20;

export const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';
export const OPENALEX_SELECT_FIELDS =
  'id,doi,display_name,publication_date,abstract_inverted_index,primary_location';
export const SEMANTIC_SCHOLAR_SEARCH_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';
export const SEMANTIC_SCHOLAR_FIELDS = 'title,url,abstract,year,venue,externalIds';
export const SEMANTIC_SCHOLAR_PAPER_URL = 'https://www.semanticscholar.org/paper/';
export const PUBMED_ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
export const PUBMED_ESUMMARY_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi';
export const PUBMED_ARTICLE_URL = 'https://pubmed.ncbi.nlm.nih.gov/';
export const PUBMED_ID_PATTERN = /^\d{1,12}$/u;
export const CROSSREF_WORKS_URL = 'https://api.crossref.org/works';
export const CROSSREF_SELECT_FIELDS = 'DOI,title,URL,abstract,published,container-title';
export const ARXIV_QUERY_URL = 'https://export.arxiv.org/api/query';
/** Most `<entry>` blocks scanned in one arXiv Atom feed. */
export const ARXIV_MAX_ENTRIES = 50;
export const STACK_EXCHANGE_SEARCH_URL = 'https://api.stackexchange.com/2.3/search/advanced';
export const STACK_EXCHANGE_SITE = 'stackoverflow';
export const HN_ALGOLIA_SEARCH_URL = 'https://hn.algolia.com/api/v1/search';
export const HN_ITEM_URL = 'https://news.ycombinator.com/item?id=';
export const HN_OBJECT_ID_PATTERN = /^\d{1,12}$/u;
export const GITHUB_REPO_SEARCH_URL = 'https://api.github.com/search/repositories';
export const GITHUB_ACCEPT = 'application/vnd.github+json';
/** `https://{lang}.wikipedia.org` — `{lang}` is validated before it is used. */
export const WIKIPEDIA_API_PATH = '/w/api.php';
export const WIKIPEDIA_ARTICLE_PATH = '/wiki/';

export const PLATFORM_ACCEPT_JSON = 'application/json';
export const PLATFORM_ACCEPT_ATOM = 'application/atom+xml';

/** The pseudo provider kind a platform result carries: `PLATFORM:<slug>`. */
export const PLATFORM_PROVIDER_KIND_PREFIX = 'PLATFORM:';

/** The sample query `POST /research/platforms/:id/test` runs when none is given. */
export const PLATFORM_TEST_DEFAULT_QUERY = 'machine learning';

/** Common HTML entities decoded in API snippets (the rest are left as text). */
export const PLATFORM_HTML_ENTITIES: ReadonlyMap<string, string> = new Map([
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&#x27;', "'"],
  ['&apos;', "'"],
  ['&nbsp;', ' '],
]);

/**
 * GitHub and Stack Overflow search match EVERY word of a query, so a question-shaped query finds nothing (measured
 * 2026-11-28: "Rust vs Go backend services 2026 community opinions benchmarks" returned 0 on both). Their query is
 * cut to its first keywords: filler words and bare years dropped.
 */
export const PLATFORM_KEYWORD_QUERY_MAX_TERMS = 4;
export const PLATFORM_KEYWORD_STOPWORDS: ReadonlySet<string> = new Set([
  'a',
  'about',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'best',
  'between',
  'by',
  'can',
  'compare',
  'comparison',
  'do',
  'does',
  'for',
  'from',
  'how',
  'in',
  'include',
  'is',
  'it',
  'latest',
  'of',
  'on',
  'or',
  'saying',
  'should',
  'that',
  'the',
  'their',
  'to',
  'versus',
  'vs',
  'what',
  'which',
  'who',
  'why',
  'with',
]);
