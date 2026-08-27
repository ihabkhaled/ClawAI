import { PLAIN_TEXT_CONTENT_TYPE } from '@/constants/seo-discovery.constants';
import { ContentCategory } from '@/enums/content-category.enum';
import { Locale } from '@/enums/locale.enum';
import { SUPPORTED_LOCALES } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import type { LocalizedContentRegistryEntry } from '@/types/content-registry.types';
import { getIndexablePagesForLocale } from '@/utilities/content-registry.utility';

const LEGAL_CATEGORIES: ReadonlySet<ContentCategory> = new Set([ContentCategory.LEGAL]);

function toLine(siteUrl: string, entry: LocalizedContentRegistryEntry): string {
  return `- [${entry.metadata.title}](${siteUrl}${entry.canonicalPath}): ${entry.metadata.description}`;
}

function section(heading: string, lines: readonly string[]): readonly string[] {
  return lines.length === 0 ? [] : ['', `## ${heading}`, '', ...lines];
}

/**
 * `/llms.txt` — a single plain-text map of the public site for an assistant that
 * has landed on the domain and needs to know what is here without crawling
 * thirteen locales of HTML first.
 *
 * It is a convenience, never a substitute: every URL it names is already in the
 * sitemap and the RSS feeds, and no assistant is required to read this file.
 * Nothing is authored here — every line is derived from the content registry, so
 * a page that is unpublished or de-indexed disappears from it in the same edit
 * rather than lingering as a hand-maintained list pointing at a 404.
 */
export function buildLlmsTxt(): string {
  const siteUrl = getSiteUrl();
  const pages = getIndexablePagesForLocale(Locale.EN);
  const home = pages.find((entry) => entry.category === ContentCategory.HOME);
  const comparisons = pages.filter((entry) => entry.category === ContentCategory.COMPARISON);
  const legal = pages.filter((entry) => LEGAL_CATEGORIES.has(entry.category));
  const product = pages.filter(
    (entry) =>
      entry.category !== ContentCategory.HOME &&
      entry.category !== ContentCategory.COMPARISON &&
      !LEGAL_CATEGORIES.has(entry.category),
  );
  const locales = SUPPORTED_LOCALES.map(({ locale }) => locale).join(', ');

  return [
    '# ClawAI',
    '',
    `> ${home?.metadata.description ?? ''}`,
    '',
    'ClawAI is an independent AI orchestration platform. It is not affiliated with,',
    'endorsed by, or a reseller for any model provider whose models it can route to.',
    '',
    `- Canonical origin: ${siteUrl}`,
    `- Languages: ${locales} (every page below exists under /{language}/)`,
    ...section(
      'Product',
      product.map((entry) => toLine(siteUrl, entry)),
    ),
    ...section(
      'Comparisons',
      comparisons.map((entry) => toLine(siteUrl, entry)),
    ),
    ...section(
      'Legal',
      legal.map((entry) => toLine(siteUrl, entry)),
    ),
    ...section('Machine-readable indexes', [
      `- [Sitemap index](${siteUrl}/sitemap.xml): every page and every public chat, per language.`,
      `- [Global feed](${siteUrl}/rss.xml): all thirteen languages in one feed, newest first.`,
      `- [English feed](${siteUrl}/en/feed.xml): one language, pages and public chats.`,
    ]),
    '',
  ].join('\n');
}

export function buildLlmsTxtResponse(cacheControl: string): Response {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': PLAIN_TEXT_CONTENT_TYPE,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
