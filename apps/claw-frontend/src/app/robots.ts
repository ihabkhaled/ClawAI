import type { MetadataRoute } from 'next';

import { PRIVATE_ROUTE_PREFIXES } from '@/constants';
import { SHARE_CHAT_PATH_PREFIX } from '@/constants/chat-share.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';

export default function robots(): MetadataRoute.Robots {
  if (shouldNoIndexEverything()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: {
      userAgent: '*',
      // Shared-chat pages are listed explicitly rather than relying on the
      // blanket `/` allow. Allow/Disallow resolve by longest match, so naming the
      // prefix means a future `Disallow: /share` (or a broader portal prefix that
      // happens to overlap) cannot silently make every published chat
      // uncrawlable. Crawlable is not the same as indexable: an UNLISTED share
      // still carries `noindex` from its own page metadata and response header.
      allow: ['/', `${SHARE_CHAT_PATH_PREFIX}/`],
      disallow: [...PRIVATE_ROUTE_PREFIXES],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
