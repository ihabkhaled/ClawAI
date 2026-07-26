import { XML_INVALID_CONTROL_PATTERN } from '@/constants/seo-discovery.constants';
import type {
  RssFeedDefinition,
  SitemapAlternate,
  SitemapUrlEntry,
} from '@/types/seo-discovery.types';

export function sanitizeXmlText(value: string): string {
  return value.replace(XML_INVALID_CONTROL_PATTERN, '');
}

export function escapeXml(value: string): string {
  return sanitizeXmlText(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function buildSitemapIndexXml(urls: ReadonlyArray<string>): string {
  const entries = urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
}

export function buildSitemapUrlSetXml(entries: ReadonlyArray<SitemapUrlEntry>): string {
  const urls = entries
    .map((entry) => {
      const alternates = (entry.alternates ?? [])
        .map((alternate: SitemapAlternate) => {
          return `<xhtml:link rel="alternate" hreflang="${escapeXml(alternate.language)}" href="${escapeXml(alternate.url)}"/>`;
        })
        .join('');
      return `<url><loc>${escapeXml(entry.url)}</loc><lastmod>${escapeXml(entry.lastModified)}</lastmod>${alternates}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}

export function buildRssXml(feed: RssFeedDefinition): string {
  const items = feed.items
    .map(
      (item) =>
        `<item><title>${escapeXml(item.title)}</title><description>${escapeXml(item.description)}</description><link>${escapeXml(item.url)}</link><guid isPermaLink="true">${escapeXml(item.guid)}</guid><pubDate>${escapeXml(new Date(item.publishedAt).toUTCString())}</pubDate><category>${escapeXml(item.category)}</category></item>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(feed.title)}</title><description>${escapeXml(feed.description)}</description><link>${escapeXml(feed.siteUrl)}</link><language>${escapeXml(feed.language)}</language><lastBuildDate>${escapeXml(new Date(feed.lastBuildDate).toUTCString())}</lastBuildDate><atom:link href="${escapeXml(feed.url)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}
