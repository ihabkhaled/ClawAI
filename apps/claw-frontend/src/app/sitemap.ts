import type { MetadataRoute } from 'next';

import { listIndexableChatShares } from '@/lib/chat-shares/public-chat-share.service';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import { getIndexablePages } from '@/utilities/content-registry.utility';
import { buildSharePath } from '@/utilities/public-shared-chat.utility';

// 15 minutes. Re-fetched periodically rather than on every request: a sitemap
// request can come from any crawler at any rate, and pulling the whole
// indexable-share feed per hit would let a crawler drive load on chat-service.
//
// Written as a literal rather than pulled from a constants file: Next reads
// segment config exports by static analysis at build time, and an imported
// identifier fails with "Invalid segment configuration export detected".
//
// The window is a compromise between two failure modes: longer, and a freshly
// published chat waits to be discoverable; shorter, and any crawler can drive the
// indexable-share feed at will. Revocation does not depend on it — the page itself
// stops resolving immediately, so a stale entry resolves to a 404, not content.
export const revalidate = 900;

/**
 * The sitemap: reviewed static pages plus every indexable public chat.
 *
 * Two properties matter more than completeness:
 *
 * 1. **Preview and non-canonical deployments publish nothing.** A staging host
 *    listing its own URLs as canonical is how a preview domain ends up
 *    outranking production.
 * 2. **A failing dynamic feed degrades, it does not throw.** The static half is
 *    always returned. `listIndexableChatShares` already swallows its own errors
 *    and returns what it collected, so a chat-service outage costs the dynamic
 *    entries and nothing else — a sitemap that 500s takes the static pages down
 *    with it, which is strictly worse.
 *
 * Only ACTIVE + PUBLIC_INDEXED + safety-APPROVED shares reach here: that filtering
 * lives in the chat-service feed query, not in this file, because the frontend must
 * never be the thing deciding what is publishable.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (shouldNoIndexEverything()) {
    return [];
  }

  const siteUrl = getSiteUrl();
  const staticEntries: MetadataRoute.Sitemap = getIndexablePages().map((page) => ({
    url: `${siteUrl}${page.canonicalPath}`,
    lastModified: page.lastReviewed,
  }));

  const shares = await listIndexableChatShares();
  const shareEntries: MetadataRoute.Sitemap = shares.map((entry) => ({
    // Identifier and timestamp only. A sitemap is a public document, so a title or
    // a thread id in it would publish more than the URL already does.
    url: `${siteUrl}${buildSharePath(entry.publicShareId)}`,
    lastModified: entry.updatedAt,
  }));

  return [...staticEntries, ...shareEntries];
}
