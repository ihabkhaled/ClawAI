/** Elements whose whole content is dropped: code, styling and non-text embeds. */
export const HTML_SKIPPED_ELEMENTS: readonly string[] = [
  'script',
  'style',
  'noscript',
  'svg',
  'template',
  'iframe',
  'object',
  'canvas',
];

/** Elements that start a new line of text. */
export const HTML_BLOCK_ELEMENTS: readonly string[] = [
  'p',
  'div',
  'br',
  'li',
  'ul',
  'ol',
  'tr',
  'table',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'nav',
  'aside',
  'blockquote',
  'pre',
  'hr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'dt',
  'dd',
  'figcaption',
];

/** Elements that start a line when they open but add nothing when they close (list items, rows). */
export const HTML_OPEN_ONLY_ELEMENTS: readonly string[] = ['li', 'dt', 'dd', 'tr', 'br', 'hr'];

export const HTML_NAMED_ENTITIES: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', ' '],
  ['ndash', '–'],
  ['mdash', '—'],
  ['hellip', '…'],
  ['copy', '©'],
]);

export const HTML_ENTITY_MAX_LENGTH = 10;
export const HTML_TAG_NAME_MAX = 20;
export const HTML_TITLE_MAX = 200;
export const HTML_MAX_CODE_POINT = 0x10_ff_ff;
