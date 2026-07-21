import {
  HTML_SANITISER_ALLOWED_URL_REGEXP as ALLOWED_URL_REGEXP,
  HTML_SANITISER_FORBID_ATTR as FORBID_ATTR,
  HTML_SANITISER_FORBID_TAGS as FORBID_TAGS,
} from '../constants/html-sanitiser.constants';

/**
 * Server-side HTML sanitiser used by the Gmail adapter (Stream 22) before
 * persisting `WorkspaceObject.metadata.renderedHtml`.
 *
 * Defence-in-depth — the rendered HTML is also placed inside an iframe with
 * `sandbox="allow-same-origin"` on the frontend, but server-side sanitisation
 * is the primary control: nothing dangerous should ever reach storage.
 */

// Lazy-load isomorphic-dompurify. Several of its transitive deps (jsdom,
// cssstyle, @asamuzakjp/css-color, @exodus/bytes) ship as ESM-only and Jest's
// CommonJS loader cannot parse them at import time. By requiring DOMPurify
// inside the call site we avoid loading those modules in tests that never
// invoke sanitiseHtml() (e.g. workspace-adapter.factory.spec, action-execution
// spec). Tests that exercise the sanitiser directly use jest.config's
// `moduleNameMapper` to swap the entire utility for a stub.
let cachedDompurify: { sanitize: (input: string, opts: object) => string } | null = null;
function getDompurify(): { sanitize: (input: string, opts: object) => string } {
  if (cachedDompurify) {
    return cachedDompurify;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('isomorphic-dompurify') as
    | { default: { sanitize: (i: string, o: object) => string } }
    | { sanitize: (i: string, o: object) => string };
  cachedDompurify = 'default' in mod ? mod.default : mod;
  return cachedDompurify;
}

export function sanitiseHtml(rawHtml: string): string {
  if (rawHtml.length === 0) {
    return '';
  }
  return getDompurify().sanitize(rawHtml, {
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOWED_URL_REGEXP,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    USE_PROFILES: { html: true },
    SANITIZE_NAMED_PROPS: true,
  });
}

/**
 * Returns a copy of the sanitised HTML with `<img>` tags neutralised. Used to
 * default-block tracking pixels until the user clicks "Load images" in the UI.
 */
export function stripImages(sanitisedHtml: string): string {
  return sanitisedHtml.replaceAll(/<img\b[^>]*>/gi, '<span data-claw="image-blocked"></span>');
}
