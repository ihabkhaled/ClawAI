/**
 * A URL written with an explicit scheme. Kept separate from the bare-domain
 * pattern because an explicit scheme is unambiguous and needs no TLD check.
 */
export const EXPLICIT_URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;

/**
 * A host written without a scheme: `example.com`, `www.site.org/path`,
 * `docs.stripe.com`. The boundary before it rejects an `@` (an email address),
 * a `/` or `.` (the middle of a longer token) and a word character.
 *
 * Deliberately loose: the TLD check below does the real filtering, because a
 * dotted word is not a URL until its last label is a real web suffix.
 */
export const BARE_HOST_PATTERN =
  /(?<![@\w./-])((?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+([a-z]{2,24}))(?::\d{2,5})?(\/[^\s<>"']*)?/giu;

/**
 * Suffixes accepted on a scheme-less host.
 *
 * An allow-list, not the whole public-suffix list, on purpose. Every detected
 * URL becomes an outbound fetch that is billed and that the model is then told
 * it read, so a false positive is a real cost and a real lie, while a missed
 * obscure TLD is recoverable by typing `https://`.
 */
export const BARE_HOST_TLDS: ReadonlySet<string> = new Set([
  // generic
  'com',
  'org',
  'net',
  'edu',
  'gov',
  'mil',
  'biz',
  // tech
  'io',
  'ai',
  'dev',
  'co',
  'xyz',
  'tech',
  // country
  'us',
  'uk',
  'ca',
  'au',
  'nz',
  'ie',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'be',
  'ch',
  'at',
  'se',
  'no',
  'fi',
  'dk',
  'cz',
  'gr',
  'ro',
  'hu',
  'tr',
  'ru',
  'ua',
  'il',
  'eg',
  'sa',
  'ae',
  'qa',
  'kw',
  'jo',
  'lb',
  'ma',
  'tn',
  'dz',
  'ng',
  'za',
  'ke',
  'pk',
  'bd',
  'lk',
  'cn',
  'hk',
  'tw',
  'jp',
  'kr',
  'sg',
  'ph',
  'th',
  'vn',
  'br',
  'ar',
  'mx',
  'cl',
  'pe',
  'eu',
  'asia',
]);

/**
 * Real suffixes that are ALSO everyday words after a dot in code or prose, so a
 * bare match is more likely an identifier than a site: `user.id`,
 * `this.app`, `app.run`, `this.store`, `window.name`, `script.py`,
 * `deploy.sh`, `README.md`, `lib.rs`.
 *
 * Accepted only with a path (`vercel.app/docs`, `bun.sh/install`) or a `www.`
 * prefix, because an identifier or a file name has neither and a link usually
 * has one. `local` lives here too: `claw.local/docs` is detected so the fetch
 * guard can refuse the private host BY NAME, while a stray `config.local` is
 * not.
 */
export const BARE_HOST_TLDS_NEEDING_PATH: ReadonlySet<string> = new Set([
  // everyday identifier words
  'id',
  'app',
  'run',
  'build',
  'store',
  'page',
  'name',
  'info',
  'pro',
  'int',
  'is',
  'to',
  'in',
  'my',
  'me',
  'so',
  'site',
  'online',
  'shop',
  'blog',
  'cloud',
  'news',
  'space',
  'live',
  'tools',
  'codes',
  'digital',
  'agency',
  'website',
  'tv',
  'fm',
  'gg',
  'im',
  'ly',
  // file extensions that are also country codes
  'py',
  'sh',
  'md',
  'rs',
  'pl',
  'ps',
  'cc',
  // private LAN names
  'local',
]);

/** Library names written with a dot that happen to end in a web TLD. */
export const BARE_HOST_KNOWN_NON_URLS: ReadonlySet<string> = new Set([
  'node.js',
  'vue.js',
  'next.js',
  'nuxt.js',
  'express.js',
  'three.js',
  'd3.js',
  'chart.js',
  'alpine.js',
  'ember.js',
  'backbone.js',
]);

/** Punctuation that ends a sentence rather than a path. */
export const TRAILING_URL_PUNCTUATION = /[.,;:!?)\]}'"]+$/u;

/** Safety bound on untrusted input, not a product decision. */
export const DETECT_URLS_DEFAULT_MAX = 10;
