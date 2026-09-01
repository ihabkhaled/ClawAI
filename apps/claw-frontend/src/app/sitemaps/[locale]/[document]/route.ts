import { CHAT_SHARE_SITEMAP_PAGE_SIZE } from '@/constants/chat-share-api.constants';
import { CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED } from '@/constants/chat-share-review-lockdown.constants';
import {
  DISCOVERY_CACHE_CONTROL,
  SITEMAP_URL_CHUNK_SIZE,
  XML_CONTENT_TYPE,
} from '@/constants/seo-discovery.constants';
import { getIndexableChatSharePage } from '@/lib/chat-shares/public-chat-share.service';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import type { DiscoveryRouteContext, SitemapUrlEntry } from '@/types/seo-discovery.types';
import {
  getIndexablePagesForLocale,
  getLanguageAlternates,
} from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale } from '@/utilities/locale.utility';
import { buildSitemapUrlSetXml } from '@/utilities/xml.utility';

// Same reason as the index: SITE_URL is injected into the running production
// container, not the Docker build, so a child sitemap rendered at build time
// would freeze the wrong canonical origin (or a noindex response) into every
// URL Google reads.
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: DiscoveryRouteContext): Promise<Response> {
  const { locale: localeValue, document } = await context.params;
  if (shouldNoIndexEverything() || !isSupportedLocale(localeValue)) {
    return new Response(null, { status: 404 });
  }
  const pageMatch = /^pages-(\d+)\.xml$/u.exec(document);
  const chatMatch = /^chats-(\d+)\.xml$/u.exec(document);
  const siteUrl = getSiteUrl();
  let entries: SitemapUrlEntry[] = [];

  if (pageMatch?.[1] !== undefined) {
    const pageChunk = Number(pageMatch[1]);
    if (!Number.isSafeInteger(pageChunk) || pageChunk < 1) {
      return new Response(null, { status: 404 });
    }
    const pageOffset = (pageChunk - 1) * SITEMAP_URL_CHUNK_SIZE;
    const localePages = getIndexablePagesForLocale(localeValue);
    // A chunk past the end is not an empty sitemap, it is a sitemap that does
    // not exist. Answering 200 with zero URLs tells Google the document is
    // healthy and holds nothing, which is indistinguishable from a real outage
    // that emptied it — and the index can genuinely point at a chunk that has
    // since shrunk away, so this is reachable in production and not only by a
    // hand-typed URL.
    if (pageChunk > 1 && pageOffset >= localePages.length) {
      return new Response(null, { status: 404 });
    }
    entries = localePages.slice(pageOffset, pageOffset + SITEMAP_URL_CHUNK_SIZE).map((page) => {
      const alternates = getLanguageAlternates(page.slug);
      return {
        url: `${siteUrl}${page.canonicalPath}`,
        lastModified: page.metadata.lastReviewed,
        alternates: [
          ...Object.entries(alternates).map(([language, path]) => ({
            language: getHtmlLanguage(language as typeof localeValue),
            url: `${siteUrl}${path}`,
          })),
          { language: 'x-default', url: `${siteUrl}/en${page.path === '/' ? '' : page.path}` },
        ],
      };
    });
  } else if (chatMatch?.[1] !== undefined) {
    // The index (sitemap.xml/route.ts) never references chats-*.xml while the
    // review lockdown is on, so reaching here means a stale cached index —
    // answer the same as any other chunk that no longer exists.
    if (CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED) {
      return new Response(null, { status: 404 });
    }
    const chunk = Number(chatMatch[1]);
    if (!Number.isSafeInteger(chunk) || chunk < 1) {
      return new Response(null, { status: 404 });
    }
    const rowsToSkip = (chunk - 1) * SITEMAP_URL_CHUNK_SIZE;
    let visited = 0;
    let cursor: string | null = null;
    while (entries.length < SITEMAP_URL_CHUNK_SIZE) {
      const page = await getIndexableChatSharePage(localeValue, cursor);
      if (page === null || page.items.length === 0) {
        break;
      }
      for (const item of page.items) {
        if (visited >= rowsToSkip && entries.length < SITEMAP_URL_CHUNK_SIZE) {
          entries.push({
            url: `${siteUrl}/${item.contentLocale}/share/chat/${item.publicShareId}`,
            lastModified: item.updatedAt,
          });
        }
        visited += 1;
      }
      cursor = page.nextCursor;
      if (cursor === null || visited >= rowsToSkip + SITEMAP_URL_CHUNK_SIZE) {
        break;
      }
      if (visited > rowsToSkip + SITEMAP_URL_CHUNK_SIZE + CHAT_SHARE_SITEMAP_PAGE_SIZE) {
        break;
      }
    }
  } else {
    return new Response(null, { status: 404 });
  }

  // Same rule for the chat half, which cannot know its length up front: it
  // pages until it fills a chunk, so "collected nothing beyond the first chunk"
  // is how out-of-range presents itself here.
  if (entries.length === 0 && chatMatch?.[1] !== undefined && Number(chatMatch[1]) > 1) {
    return new Response(null, { status: 404 });
  }

  return new Response(buildSitemapUrlSetXml(entries), {
    headers: {
      'Cache-Control': DISCOVERY_CACHE_CONTROL,
      'Content-Type': XML_CONTENT_TYPE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
