import { CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED } from '@/constants/chat-share-review-lockdown.constants';
import {
  DISCOVERY_CACHE_CONTROL,
  SITEMAP_URL_CHUNK_SIZE,
  XML_CONTENT_TYPE,
} from '@/constants/seo-discovery.constants';
import { countIndexableChatShares } from '@/lib/chat-shares/public-chat-share.service';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import { getIndexablePagesForLocale } from '@/utilities/content-registry.utility';
import { buildSitemapIndexXml } from '@/utilities/xml.utility';

// Discovery depends on runtime SITE_URL and live public-share counts.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  if (shouldNoIndexEverything()) {
    return new Response(buildSitemapIndexXml([]), {
      headers: { 'Content-Type': XML_CONTENT_TYPE, 'X-Robots-Tag': 'noindex' },
    });
  }

  const siteUrl = getSiteUrl();
  // During the AdSense review window, chat shares are excluded from the
  // sitemap outright (CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED) — skip the
  // chat-service round trip entirely rather than fetch counts nothing will use.
  const counts = CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED
    ? []
    : await Promise.all(
        SUPPORTED_LOCALES.map(async ({ locale }) => countIndexableChatShares(locale)),
      );
  const childUrls: string[] = [];
  for (const { locale } of SUPPORTED_LOCALES) {
    // Page chunks are counted rather than assumed. Hardcoding `pages-1.xml`
    // silently capped the static half of the sitemap at one chunk, so the
    // 40 001st registry page in a locale would have been unreachable to a
    // crawler while looking perfectly healthy from the index.
    const pageCount = getIndexablePagesForLocale(locale).length;
    for (let chunk = 1; chunk <= Math.ceil(pageCount / SITEMAP_URL_CHUNK_SIZE); chunk += 1) {
      childUrls.push(`${siteUrl}/sitemaps/${locale}/pages-${String(chunk)}.xml`);
    }
    const count = counts.find((entry) => entry?.locale === locale)?.count ?? 0;
    for (let chunk = 1; chunk <= Math.ceil(count / SITEMAP_URL_CHUNK_SIZE); chunk += 1) {
      childUrls.push(`${siteUrl}/sitemaps/${locale}/chats-${String(chunk)}.xml`);
    }
  }
  return new Response(buildSitemapIndexXml(childUrls), {
    headers: {
      'Cache-Control': DISCOVERY_CACHE_CONTROL,
      'Content-Type': XML_CONTENT_TYPE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
