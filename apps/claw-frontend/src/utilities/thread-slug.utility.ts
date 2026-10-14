/**
 * A Thread slug is built from the title's words, so it carries every script (Arabic, Persian,
 * Hindi, Japanese, Thai, Russian ...) plus the combining marks those scripts need, joined by
 * hyphens. An ASCII-only check silently dropped every non-Latin Thread. The cap is the longest
 * slug the Threads service issues: up to 60 code points of title plus `-` and 8 id characters
 * (69), so the check allows 96 and never rejects a slug the service made.
 */
const THREAD_SLUG_PATTERN = /^[\p{L}\p{N}\p{M}-]{1,96}$/u;

export function isValidThreadSlug(slug: string): boolean {
  return THREAD_SLUG_PATTERN.test(slug);
}

/**
 * The slug a route parameter stands for. Next hands a dynamic segment over still percent-encoded
 * (`%D9%83...`), so passing it on unchanged made the API look up the wrong string (or, when
 * encoded again, a double-encoded one) and answer 404. Returns null for malformed encoding or a
 * value that is not a slug.
 */
export function decodeThreadSlugParam(param: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(param);
  } catch {
    return null;
  }
  const slug = decoded.normalize('NFC');
  return isValidThreadSlug(slug) ? slug : null;
}

/**
 * One URL path segment for a slug. Dots are encoded too so a hostile slug of `.` or `..` can
 * never act as a dot-segment.
 */
export function encodeThreadSlug(slug: string): string {
  return encodeURIComponent(slug.normalize('NFC')).replaceAll('.', '%2E');
}

/** Whether a path segment (encoded or not) is a valid Thread slug. */
export function isThreadSlugSegment(segment: string): boolean {
  return decodeThreadSlugParam(segment) !== null;
}

/** The absolute public address of a Thread: one encoded segment, so a crawler never gets a raw one. */
export function threadCanonicalUrl(siteUrl: string, locale: string, slug: string): string {
  return `${siteUrl}/${locale}/threads/${encodeThreadSlug(slug)}`;
}

/** The locale-prefixed path of a Thread, for an in-page link. */
export function threadLocalePath(locale: string, slug: string): string {
  return `/${locale}/threads/${encodeThreadSlug(slug)}`;
}
