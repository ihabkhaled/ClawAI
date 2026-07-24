import type { MetadataRoute } from 'next';

import { PRIVATE_ROUTE_PREFIXES } from '@/constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';

export default function robots(): MetadataRoute.Robots {
  if (shouldNoIndexEverything()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [...PRIVATE_ROUTE_PREFIXES],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
