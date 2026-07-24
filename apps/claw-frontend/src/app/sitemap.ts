import type { MetadataRoute } from 'next';

import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import { getIndexablePages } from '@/utilities';

// Preview and non-canonical deployments must never publish their own URLs
// as if they were the production sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  if (shouldNoIndexEverything()) {
    return [];
  }

  const siteUrl = getSiteUrl();

  return getIndexablePages().map((page) => ({
    url: `${siteUrl}${page.canonicalPath}`,
    lastModified: page.lastReviewed,
  }));
}
