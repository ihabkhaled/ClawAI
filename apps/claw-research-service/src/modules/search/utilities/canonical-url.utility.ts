const TRACKING_PARAMS: ReadonlySet<string> = new Set([
  'fbclid',
  'gclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
]);

/**
 * Same page, same key.
 *
 * Drops the scheme, the fragment, a leading www, default ports, tracking
 * parameters and a trailing slash, lowercases the host and sorts what is left
 * of the query. Keeps the path case: plenty of sites serve different content
 * from paths that differ only in case.
 */
export function canonicalUrlKey(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
        url.searchParams.delete(key);
      }
    }
    url.searchParams.sort();
    const host = url.host.toLowerCase().replace(/^www\./u, '');
    const path = url.pathname.replace(/\/+$/u, '');
    return `${host}${path}${url.search}`;
  } catch {
    // Not parseable as a URL: compare it as the opaque string it is rather
    // than dropping the result.
    return rawUrl.trim().toLowerCase();
  }
}
