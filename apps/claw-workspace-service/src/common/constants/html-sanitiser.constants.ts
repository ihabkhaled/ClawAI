/**
 * Configuration for the server-side HTML sanitiser used by the Gmail adapter
 * (Stream 22) before persisting `WorkspaceObject.metadata.renderedHtml`.
 * Extracted from the utility file to comply with the no-top-level-const rule.
 */

export const HTML_SANITISER_FORBID_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'base',
  'meta',
  'link',
];

export const HTML_SANITISER_FORBID_ATTR = [
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
export const HTML_SANITISER_ALLOWED_URI_REGEXP = /^(?:https?|mailto|cid|tel):/i;
