/** Wikipedia REST: rendered article HTML for a title. `{host}` keeps the language edition. */
export const WIKIPEDIA_REST_HTML_TEMPLATE = 'https://{host}/api/rest_v1/page/html/{title}';

/** GitHub REST: a repository's README, raw. Unauthenticated: 60 requests/hour per IP. */
export const GITHUB_README_TEMPLATE = 'https://api.github.com/repos/{owner}/{repo}/readme';
export const GITHUB_RAW_ACCEPT = 'application/vnd.github.raw+json';

/** arXiv export API (Atom). */
export const ARXIV_QUERY_TEMPLATE = 'https://export.arxiv.org/api/query?id_list={id}';

/** Crossref works API. */
export const CROSSREF_WORK_TEMPLATE = 'https://api.crossref.org/works/{doi}';

/** Hacker News Firebase API. */
export const HACKER_NEWS_ITEM_TEMPLATE = 'https://hacker-news.firebaseio.com/v0/item/{id}.json';

/** Hosts answered by the DOI resolver. */
export const DOI_HOSTS: ReadonlySet<string> = new Set(['doi.org', 'dx.doi.org', 'www.doi.org']);

/** Hosts for arXiv abstract/PDF pages. */
export const ARXIV_HOSTS: ReadonlySet<string> = new Set(['arxiv.org', 'www.arxiv.org']);

/** GitHub path segments that are site pages, not an owner. */
export const GITHUB_RESERVED_OWNERS: ReadonlySet<string> = new Set([
  'about',
  'features',
  'pricing',
  'topics',
  'trending',
  'marketplace',
  'orgs',
  'settings',
  'login',
  'sponsors',
  'collections',
  'explore',
  'search',
]);

/**
 * The fixed API hosts the official-API strategy may call (TD-038 allowlist
 * for `assertSafeRequestUrl`). Wikipedia's per-language hosts are added per
 * call, only for a `*.wikipedia.org` host the resolver produced.
 */
export const OFFICIAL_API_FIXED_HOSTS: readonly string[] = [
  'api.github.com',
  'export.arxiv.org',
  'api.crossref.org',
  'hacker-news.firebaseio.com',
];

/** Suffix of the Wikipedia language editions the REST API lives on. */
export const WIKIPEDIA_HOST_SUFFIX = '.wikipedia.org';

/** Largest official-API response body read, in bytes. */
export const OFFICIAL_API_MAX_BYTES = 2 * 1024 * 1024;
