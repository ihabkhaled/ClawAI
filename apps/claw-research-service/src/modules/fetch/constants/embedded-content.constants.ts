/**
 * Embedded-state and site-adapter extraction (thin-page fallback). Every
 * bound here keeps a hostile or huge page from costing more than a parse.
 */

/**
 * Script blocks are found with a linear indexOf scan (script-blocks.utility), never a lazy regex over
 * the raw page: many `<script` openers and no `</script>` made `[\s\S]*?` quadratic (security review
 * 2026-11-23). These caps bound the work on any page.
 */
export const EMBEDDED_HTML_SCAN_MAX_CHARS = 5_000_000;
export const EMBEDDED_MAX_SCRIPT_BLOCKS = 500;
export const SCRIPT_OPEN_TAG = '<script';
export const SCRIPT_CLOSE_TAG = '</script';

/** `type="application/json"` or `type="application/ld+json"` on a script tag. */
export const JSON_SCRIPT_TYPE_RE = /type\s*=\s*["']?application\/(?:ld\+)?json/iu;

export const LD_JSON_TYPE_RE = /application\/ld\+json/iu;
export const NEXT_DATA_ID_RE = /id\s*=\s*["']?__NEXT_DATA__/u;
export const NUXT_DATA_ID_RE = /id\s*=\s*["']?__NUXT_DATA__/u;

/** The call that carries one React Router turbo-stream chunk (a JS string literal, read linearly). */
export const REACT_ROUTER_ENQUEUE_CALL = 'streamController.enqueue(';

/**
 * Global names pages assign their server state to, read as `name = {…}` with
 * a strict JSON parse (a JS object literal that is not JSON is skipped).
 */
export const WINDOW_STATE_NAMES: readonly string[] = [
  '__INITIAL_STATE__',
  '__PRELOADED_STATE__',
  '__APOLLO_STATE__',
  '__INITIAL_DATA__',
  '__NUXT__',
  '__remixContext',
  '__staticRouterHydrationData',
  'ytInitialPlayerResponse',
  'ytInitialData',
];

/** A script body larger than this is not parsed, in chars. */
export const EMBEDDED_SCRIPT_MAX_CHARS = 4 * 1024 * 1024;

/** A string shorter than this is never prose (labels, ids, enum values). */
export const PROSE_MIN_CHARS = 40;

/** A non-CJK prose string has at least this many spaces (≈ five words). */
export const PROSE_MIN_SPACES = 4;

/** At least this share of a prose string's non-space characters are letters. */
export const PROSE_MIN_LETTER_SHARE = 0.5;

/** Walk ceilings for one page's embedded data. */
export const PROSE_MAX_NODES = 200_000;
export const PROSE_MAX_DEPTH = 64;

/** Embedded text shorter than this does not replace the visible text. */
export const EMBEDDED_STATE_MIN_CHARS = 200;

/** Visible text shorter than this triggers the embedded-state fallback. */
export const EMBEDDED_STATE_THIN_VISIBLE_CHARS = 500;

/** Upper bound on recovered text, in chars (matches `FETCH_MAX_CONTENT_LENGTH`). */
export const EMBEDDED_STATE_MAX_CHARS = 32_000;

/**
 * Keys whose string values are never prose: identifiers, links, styling,
 * crypto material and URL lists. Skipping them keeps tokens and tracking
 * strings out of the recovered text.
 */
export const PROSE_SKIPPED_KEYS: ReadonlySet<string> = new Set([
  'id',
  'key',
  'url',
  'uri',
  'href',
  'src',
  'srcset',
  'path',
  'slug',
  'image',
  'thumbnail',
  'icon',
  'logo',
  'class',
  'className',
  'style',
  'css',
  'token',
  'nonce',
  'hash',
  'sha',
  'signature',
  'cursor',
  'etag',
  'type',
  'mimeType',
  'locale',
  '@context',
  '@type',
  '@id',
  'safe_urls',
  'blocked_urls',
  'buildId',
  'scriptLoader',
]);

/** Roles kept from a shared ChatGPT conversation, and how they are labelled. */
export const CHATGPT_SHARE_ROLE_LABELS: ReadonlyMap<string, string> = new Map([
  ['user', 'User'],
  ['assistant', 'ChatGPT'],
]);

/** ChatGPT message content types whose `parts` are readable text. */
export const CHATGPT_SHARE_TEXT_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'text',
  'multimodal_text',
]);

export const CHATGPT_SHARE_HOSTS: ReadonlySet<string> = new Set([
  'chatgpt.com',
  'www.chatgpt.com',
  'chat.openai.com',
]);

export const CHATGPT_SHARE_PATH_RE = /^\/share\/[\w-]+\/?$/u;

export const YOUTUBE_WATCH_HOSTS: ReadonlySet<string> = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
]);
