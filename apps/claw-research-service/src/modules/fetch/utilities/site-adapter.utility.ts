import { SITE_ADAPTERS } from '../constants/site-adapters.constants';
import type { SiteAdapter, SiteAdapterMatch } from '../types/embedded-content.types';

/** The first registered adapter matching `finalUrl` that yields text, or null. */
export function extractWithSiteAdapter(
  html: string,
  finalUrl: string,
  adapters: readonly SiteAdapter[] = SITE_ADAPTERS,
): SiteAdapterMatch | null {
  let url: URL;
  try {
    url = new URL(finalUrl);
  } catch {
    return null;
  }
  for (const adapter of adapters) {
    if (!adapter.matches(url)) {
      continue;
    }
    const extracted = adapter.extract(html, url);
    if (extracted !== null && extracted.text.trim().length > 0) {
      return { ...extracted, adapter: adapter.name };
    }
  }
  return null;
}
