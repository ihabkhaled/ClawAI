export const PAGE_HTML_TYPES: readonly string[] = ['text/html', 'application/xhtml+xml'];
export const PAGE_TEXT_TYPES: readonly string[] = [
  'application/json',
  'application/xml',
  'application/rss+xml',
  'application/atom+xml',
  'application/ld+json',
];
export const WEB_FETCH_TOOL = 'fetch_page';
export const WEB_FETCH_UNREACHABLE =
  'The page could not be fetched. Only public https pages can be read.';
