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
  const counts = await Promise.all(
    SUPPORTED_LOCALES.map(async ({ locale }) => countIndexableChatShares(locale)),
  );
  const childUrls: string[] = [];
  for (const { locale } of SUPPORTED_LOCALES) {
    if (getIndexablePagesForLocale(locale).length > 0) {
      childUrls.push(`${siteUrl}/sitemaps/${locale}/pages-1.xml`);
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
