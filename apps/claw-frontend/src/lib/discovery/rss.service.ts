import { createHash } from 'node:crypto';

import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  DEGRADED_RSS_CACHE_CONTROL,
  DISCOVERY_RETRY_AFTER_SECONDS,
  RSS_CACHE_CONTROL,
  RSS_CONTENT_TYPE,
} from '@/constants/seo-discovery.constants';
import { RssFeedKind } from '@/enums/rss-feed-kind.enum';
import { listPublicChatRssEntries } from '@/lib/chat-shares/public-chat-share.service';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import type { RssFeedItem } from '@/types/seo-discovery.types';
import { getIndexablePagesForLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale } from '@/utilities/locale.utility';
import { buildRssXml } from '@/utilities/xml.utility';

export async function buildLocalizedRssResponse(
  request: Request,
  kind: RssFeedKind,
): Promise<Response> {
  if (shouldNoIndexEverything()) {
    return new Response(null, { status: 404 });
  }
  const localeHeader = request.headers.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(localeHeader) ? localeHeader : DEFAULT_LOCALE;
  const siteUrl = getSiteUrl();
  const topicItems: RssFeedItem[] =
    kind === RssFeedKind.CHATS
      ? []
      : getIndexablePagesForLocale(locale).map((page) => ({
          title: page.metadata.title,
          description: page.metadata.description,
          url: `${siteUrl}${page.canonicalPath}`,
          guid: `${siteUrl}${page.canonicalPath}`,
          publishedAt: page.metadata.lastReviewed,
          category: page.category,
        }));
  const chatEntries = kind === RssFeedKind.TOPICS ? [] : await listPublicChatRssEntries(locale);
  if (kind === RssFeedKind.CHATS && chatEntries === null) {
    return new Response(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(DISCOVERY_RETRY_AFTER_SECONDS),
        'X-Claw-Discovery-Degraded': 'chat-feed-unavailable',
      },
    });
  }
  const chatFeedDegraded = chatEntries === null;
  const chatItems: RssFeedItem[] = (chatEntries ?? []).map((entry) => ({
    title: entry.title,
    description: entry.description ?? '',
    url: `${siteUrl}/${entry.contentLocale}/share/chat/${entry.publicShareId}`,
    guid: `${siteUrl}/${entry.contentLocale}/share/chat/${entry.publicShareId}`,
    publishedAt: entry.publishedAt,
    category: 'public-chat',
  }));
  const items = [...topicItems, ...chatItems].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );
  const feedPathByKind: Readonly<Record<RssFeedKind, string>> = {
    [RssFeedKind.COMBINED]: 'feed.xml',
    [RssFeedKind.TOPICS]: 'feeds/topics.xml',
    [RssFeedKind.CHATS]: 'feeds/chats.xml',
  };
  const feedPath = feedPathByKind[kind];
  const feedUrl = `${siteUrl}/${locale}/${feedPath}`;
  const lastBuildDate = items[0]?.publishedAt ?? new Date().toISOString();
  const xml = buildRssXml({
    title: `ClawAI — ${locale.toUpperCase()}`,
    description: `ClawAI public updates in ${getHtmlLanguage(locale)}`,
    url: feedUrl,
    siteUrl: `${siteUrl}/${locale}`,
    language: getHtmlLanguage(locale),
    lastBuildDate,
    items,
  });
  const etag = `"${createHash('sha256').update(xml).digest('base64url')}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  return new Response(xml, {
    headers: {
      'Cache-Control': RSS_CACHE_CONTROL,
      'Content-Type': RSS_CONTENT_TYPE,
      ETag: etag,
      'Last-Modified': new Date(lastBuildDate).toUTCString(),
      'X-Content-Type-Options': 'nosniff',
      ...(chatFeedDegraded
        ? {
            'Cache-Control': DEGRADED_RSS_CACHE_CONTROL,
            'X-Claw-Discovery-Degraded': 'chat-feed-unavailable',
          }
        : {}),
    },
  });
}
