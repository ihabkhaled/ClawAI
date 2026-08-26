import { createHash } from 'node:crypto';

import {
  DEGRADED_RSS_CACHE_CONTROL,
  RSS_CACHE_CONTROL,
  RSS_GLOBAL_MAX_ITEMS,
} from '@/constants/seo-discovery.constants';
import type { Locale } from '@/enums/locale.enum';
import { listPublicChatRssEntries } from '@/lib/chat-shares/public-chat-share.service';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import type { RssFeedItem } from '@/types/seo-discovery.types';
import { getIndexablePagesForLocale } from '@/utilities/content-registry.utility';
import { resolveFeedContentType } from '@/utilities/discovery-content-type.utility';
import { getHtmlLanguage } from '@/utilities/locale.utility';
import { buildRssXml } from '@/utilities/xml.utility';

// Every public URL the site has, in every locale, in one document.
//
// The per-locale feeds answer "what is new in this language" and take their
// locale from the request header, which means a reader who subscribes to
// /feed.xml gets exactly one of the thirteen languages and never learns the
// others exist. This feed is the opposite trade: one fixed URL, no negotiation,
// everything in it, each item labelled with its own language.
async function collectLocaleItems(
  locale: Locale,
  siteUrl: string,
): Promise<{ items: RssFeedItem[]; degraded: boolean }> {
  const language = getHtmlLanguage(locale);
  const pageItems: RssFeedItem[] = getIndexablePagesForLocale(locale).map((page) => ({
    title: page.metadata.title,
    description: page.metadata.description,
    url: `${siteUrl}${page.canonicalPath}`,
    guid: `${siteUrl}${page.canonicalPath}`,
    publishedAt: page.metadata.lastReviewed,
    category: page.category,
    language,
  }));

  const chatEntries = await listPublicChatRssEntries(locale);
  const chatItems: RssFeedItem[] = (chatEntries ?? []).map((entry) => ({
    title: entry.title,
    description: entry.description ?? '',
    url: `${siteUrl}/${entry.contentLocale}/share/chat/${entry.publicShareId}`,
    guid: `${siteUrl}/${entry.contentLocale}/share/chat/${entry.publicShareId}`,
    publishedAt: entry.publishedAt,
    category: 'public-chat',
    language: getHtmlLanguage(entry.contentLocale),
  }));

  return { items: [...pageItems, ...chatItems], degraded: chatEntries === null };
}

export async function buildGlobalRssResponse(request: Request): Promise<Response> {
  if (shouldNoIndexEverything()) {
    return new Response(null, { status: 404 });
  }

  const siteUrl = getSiteUrl();
  // One locale's chat feed failing must not cost the other twelve, and must
  // never cost the registry pages, which need no upstream at all.
  const collected = await Promise.all(
    SUPPORTED_LOCALES.map(async ({ locale }) => collectLocaleItems(locale, siteUrl)),
  );
  const degraded = collected.some((entry) => entry.degraded);
  const items = collected
    .flatMap((entry) => entry.items)
    .sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt))
    .slice(0, RSS_GLOBAL_MAX_ITEMS);

  const lastBuildDate = items[0]?.publishedAt ?? new Date().toISOString();
  const xml = buildRssXml({
    title: 'ClawAI — all languages',
    description:
      'Every public ClawAI page and shared conversation, across all supported languages.',
    url: `${siteUrl}/rss.xml`,
    siteUrl,
    // The channel language names the default locale; each item carries its own
    // `dc:language`, which is what a reader should trust here.
    language: getHtmlLanguage(DEFAULT_LOCALE),
    lastBuildDate,
    items,
  });

  const etag = `"${createHash('sha256').update(xml).digest('base64url')}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(xml, {
    headers: {
      'Cache-Control': degraded ? DEGRADED_RSS_CACHE_CONTROL : RSS_CACHE_CONTROL,
      'Content-Type': resolveFeedContentType(request),
      // The type is chosen from Accept, so a shared cache must key on it or it
      // will hand a feed reader the browser's answer.
      Vary: 'Accept',
      ETag: etag,
      'Last-Modified': new Date(lastBuildDate).toUTCString(),
      'X-Content-Type-Options': 'nosniff',
      ...(degraded ? { 'X-Claw-Discovery-Degraded': 'chat-feed-unavailable' } : {}),
    },
  });
}
