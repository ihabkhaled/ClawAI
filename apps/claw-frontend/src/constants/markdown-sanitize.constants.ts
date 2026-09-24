import type { Options as SanitizeSchema } from 'rehype-sanitize';

/**
 * The only HTML the in-chat markdown renderer will turn into elements.
 *
 * Models emit `<details><summary>…</summary>…</details>` for quiz answers and
 * spoilers, plus inline tags like `<kbd>` and `<sub>`. Without `rehype-raw`
 * all of that reached users as raw tag text (claw-ai.co, 2026-09-24). With it,
 * this schema is the security boundary: it runs AFTER `rehype-raw` over the
 * whole tree, so it must also allow every element markdown/GFM itself emits.
 *
 * Built as an explicit allowlist rather than `defaultSchema` minus a few tags,
 * so a future hast-util-sanitize default widening cannot silently widen chat.
 * Never here: script, style, iframe/object/embed, form/input (except GFM task
 * checkboxes), svg/math, `style`, `class` (except the GFM/highlight classes
 * below), and every `on*` attribute — none of those are listed, so all drop.
 */

/** Markdown + GFM output: paragraphs, lists, tables, code, footnotes, task lists. */
const MARKDOWN_OUTPUT_TAGS = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'img',
  'input',
  'li',
  'ol',
  'p',
  'pre',
  'section',
  'strong',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
] as const;

/** Raw HTML a model may write that we deliberately render. */
export const MARKDOWN_ALLOWED_RAW_HTML_TAGS = [
  'details',
  'summary',
  'strong',
  'b',
  'em',
  'i',
  'br',
  'sub',
  'sup',
  'kbd',
  'mark',
] as const;

/**
 * remark-rehype already prefixes every generated id (footnotes) with
 * `user-content-`. Only ids carrying that prefix survive: markdown footnotes
 * keep working, while a raw `<b id="__NEXT_DATA__">` cannot clobber a window
 * global. Clobbering is therefore disabled — re-prefixing would double the
 * prefix and break every footnote link.
 */
const USER_CONTENT_ID = /^user-content-/;

export const MARKDOWN_SANITIZE_SCHEMA: SanitizeSchema = {
  tagNames: [...new Set([...MARKDOWN_OUTPUT_TAGS, ...MARKDOWN_ALLOWED_RAW_HTML_TAGS])],
  attributes: {
    a: [
      'href',
      'title',
      'dataFootnoteRef',
      'dataFootnoteBackref',
      ['className', 'data-footnote-backref'],
      ['ariaDescribedBy', USER_CONTENT_ID],
      'ariaLabel',
    ],
    code: [['className', /^language-./]],
    details: ['open'],
    h2: [['className', 'sr-only']],
    img: ['src', 'alt', 'title'],
    input: [['disabled', true], ['type', 'checkbox'], 'checked'],
    li: [['className', 'task-list-item']],
    ol: [['className', 'contains-task-list'], 'start'],
    section: ['dataFootnotes', ['className', 'footnotes']],
    td: ['align'],
    th: ['align'],
    ul: [['className', 'contains-task-list']],
    '*': [['id', USER_CONTENT_ID], 'dir', 'lang'],
  },
  clobber: [],
  clobberPrefix: '',
  protocols: {
    href: ['http', 'https', 'mailto'],
    src: ['http', 'https'],
  },
  required: {
    input: { disabled: true, type: 'checkbox' },
  },
  // Dropped WITH their contents — the text of a <script>/<style> is never
  // meaningful to the reader and must not leak through as prose.
  strip: ['script', 'style', 'template', 'noscript', 'title', 'textarea', 'xmp', 'iframe'],
};
