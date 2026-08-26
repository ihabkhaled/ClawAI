export const LOCALE_REQUEST_HEADER = 'x-claw-locale';

export const LOCALE_REWRITE_HEADER = 'x-claw-locale-rewrite';

export const LOCALE_PREFERENCE_COOKIE = 'claw-locale';

export const LOCALE_NEUTRAL_PREFIXES: ReadonlyArray<string> = [
  '/api',
  '/_next',
  '/sitemap.xml',
  '/sitemaps',
  // The global feed is deliberately locale-neutral: it carries every locale at
  // once, so redirecting it to /{locale}/rss.xml would hand a crawler one
  // language and hide the other twelve.
  '/rss.xml',
  '/discovery.xsl',
  '/robots.txt',
  '/ads.txt',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon.png',
  '/apple-icon.png',
  '/opengraph-image',
];
