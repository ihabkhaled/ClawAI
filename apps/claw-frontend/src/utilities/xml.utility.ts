import {
  DISCOVERY_STYLESHEET_PATH,
  XML_INVALID_CONTROL_PATTERN,
} from '@/constants/seo-discovery.constants';
import type {
  RssFeedDefinition,
  SitemapAlternate,
  SitemapUrlEntry,
} from '@/types/seo-discovery.types';

/**
 * XML prologue plus the stylesheet reference.
 *
 * Parsers ignore an `xml-stylesheet` processing instruction, so this changes
 * nothing for a crawler. It changes everything for a person: Chrome 151 dropped
 * its built-in XML viewer, and without a stylesheet these documents render as
 * one unbroken run of text that reads as a corrupt file.
 */
const XML_PROLOGUE = `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="${DISCOVERY_STYLESHEET_PATH}"?>`;

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
  return `${XML_PROLOGUE}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`;
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
  return `${XML_PROLOGUE}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}

export function buildRssXml(feed: RssFeedDefinition): string {
  const items = feed.items
    .map((item) => {
      const language =
        item.language === undefined ? '' : `<dc:language>${escapeXml(item.language)}</dc:language>`;
      return `<item><title>${escapeXml(item.title)}</title><description>${escapeXml(item.description)}</description><link>${escapeXml(item.url)}</link><guid isPermaLink="true">${escapeXml(item.guid)}</guid><pubDate>${escapeXml(new Date(item.publishedAt).toUTCString())}</pubDate><category>${escapeXml(item.category)}</category>${language}</item>`;
    })
    .join('');
  return `${XML_PROLOGUE}<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${escapeXml(feed.title)}</title><description>${escapeXml(feed.description)}</description><link>${escapeXml(feed.siteUrl)}</link><language>${escapeXml(feed.language)}</language><lastBuildDate>${escapeXml(new Date(feed.lastBuildDate).toUTCString())}</lastBuildDate><atom:link href="${escapeXml(feed.url)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}
