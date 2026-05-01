import DOMPurify from 'isomorphic-dompurify';

/**
 * Server-side HTML sanitiser used by the Gmail adapter (Stream 22) before
 * persisting `WorkspaceObject.metadata.renderedHtml`.
 *
 * Defence-in-depth — the rendered HTML is also placed inside an iframe with
 * `sandbox="allow-same-origin"` on the frontend, but server-side sanitisation
 * is the primary control: nothing dangerous should ever reach storage.
 */
const FORBID_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'base', 'meta', 'link'];

const FORBID_ATTR = [
  'onerror',
  'onload',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onkeydown',
  'onkeyup',
  'formaction',
  'srcdoc',
];

/**
 * Allow-list for URI schemes inside href / src / action / cite. Strips
 * `javascript:`, `data:` (except text/css for inline-style), `vbscript:`, etc.
 */
const ALLOWED_URI_REGEXP = /^(?:https?|mailto|cid|tel):/i;

export function sanitiseHtml(rawHtml: string): string {
  if (rawHtml.length === 0) {
    return '';
  }
  return DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOWED_URI_REGEXP,
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
    USE_PROFILES: { html: true },
    SANITIZE_NAMED_PROPS: true,
  }) as string;
}

/**
 * Returns a copy of the sanitised HTML with `<img>` tags neutralised. Used to
 * default-block tracking pixels until the user clicks "Load images" in the UI.
 */
export function stripImages(sanitisedHtml: string): string {
  return sanitisedHtml.replaceAll(/<img\b[^>]*>/gi, '<span data-claw="image-blocked"></span>');
}
