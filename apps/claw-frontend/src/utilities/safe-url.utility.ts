import {
  DEL_CODE_POINT,
  MAX_UNSAFE_URL_CODE_POINT,
  SAFE_URL_SCHEMES,
} from '@/constants/safe-url.constants';

/**
 * Whether the string contains whitespace, a C0 control, or DEL.
 *
 * Browsers strip these before parsing a URL's scheme, so a newline or tab inside
 * "javascript:" still navigates. Comparing code points rather than matching a
 * regex keeps the intent legible and avoids a character class whose contents are
 * invisible in a diff.
 */
function hasUnsafeUrlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= MAX_UNSAFE_URL_CODE_POINT || codePoint === DEL_CODE_POINT) {
      return true;
    }
  }
  return false;
}

/**
 * Whether a URL from untrusted content may be used as an `href`.
 *
 * Assume the string is hostile: it came from a chat message anybody could have
 * written, and it is about to be rendered on a page served from our own origin.
 *
 * The check is an allow-list of schemes, not a block-list. A block-list has to
 * anticipate every dangerous scheme — javascript, vbscript, data, file, and
 * whatever a browser adds next — and one miss is a stored XSS. An allow-list only
 * has to know the handful of schemes a link legitimately needs.
 *
 * Relative and fragment URLs are allowed: they cannot escape our origin and cannot
 * carry script. A protocol-relative URL is NOT relative — it is absolute with an
 * inherited scheme — so it is rejected outright.
 */
export function isSafeHref(rawHref: string | undefined): boolean {
  if (rawHref === undefined || rawHref.length === 0) {
    return false;
  }
  const href = rawHref.trim();
  if (href.length === 0 || hasUnsafeUrlCharacter(href)) {
    return false;
  }
  if (href.startsWith('//')) {
    return false;
  }
  if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) {
    return true;
  }

  const schemeMatch = /^([a-z][a-z\d+.-]*):/iu.exec(href);
  if (schemeMatch === null) {
    // No scheme at all — a bare relative path such as "docs/guide".
    return true;
  }
  return SAFE_URL_SCHEMES.includes(schemeMatch[1]?.toLowerCase() ?? '');
}

/** The href to render, or null when the original must be dropped. */
export function toSafeHref(rawHref: string | undefined): string | null {
  if (!isSafeHref(rawHref) || rawHref === undefined) {
    return null;
  }
  return rawHref.trim();
}
