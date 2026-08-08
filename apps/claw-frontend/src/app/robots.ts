import type { MetadataRoute } from 'next';

import { PRIVATE_ROUTE_PREFIXES } from '@/constants';
import { SHARE_CHAT_PATH_PREFIX } from '@/constants/chat-share.constants';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';

// SITE_URL is injected into the running production container, not the Docker
// build. Prevent Next from freezing a build-time noindex response into cache.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  if (shouldNoIndexEverything()) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  const localizedPrivateRoutes = SUPPORTED_LOCALES.flatMap(({ locale }) =>
    PRIVATE_ROUTE_PREFIXES.map((prefix) => `/${locale}${prefix}`),
  );
  const localizedShareRoutes = SUPPORTED_LOCALES.map(
    ({ locale }) => `/${locale}${SHARE_CHAT_PATH_PREFIX}/`,
  );

  return {
    rules: {
      userAgent: '*',
      // Shared-chat pages are listed explicitly rather than relying on the
      // blanket `/` allow. Allow/Disallow resolve by longest match, so naming the
      // prefix means a future `Disallow: /share` (or a broader portal prefix that
      // happens to overlap) cannot silently make every published chat
      // uncrawlable. Crawlable is not the same as indexable: an UNLISTED share
      // still carries `noindex` from its own page metadata and response header.
      allow: ['/', ...localizedShareRoutes],
      disallow: [...PRIVATE_ROUTE_PREFIXES, ...localizedPrivateRoutes],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
