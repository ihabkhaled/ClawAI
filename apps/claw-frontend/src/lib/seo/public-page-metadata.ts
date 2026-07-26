import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { Locale } from '@/enums/locale.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import {
  getLanguageAlternates,
  getPageBySlugAndLocale,
} from '@/utilities/content-registry.utility';
import {
  getHtmlLanguage,
  getOpenGraphLocale,
  isSupportedLocale,
  localisePath,
} from '@/utilities/locale.utility';

const OPEN_GRAPH_IMAGE_PATH = '/opengraph-image';

function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}

export function buildPublicPageMetadata(slug: string, locale: Locale): Metadata {
  const siteUrl = getSiteUrl();
  const entry = getPageBySlugAndLocale(slug, locale);
  const canonicalPath =
    entry === undefined ? `/${locale}` : localisePath(entry.canonicalPath, locale);
  const canonical = absoluteUrl(siteUrl, canonicalPath);
  const title = entry?.title ?? 'ClawAI';
  const description = entry?.description ?? '';
  const indexable = entry !== undefined && !shouldNoIndexEverything();
  const languageAlternates = getLanguageAlternates(slug);
  const languages = Object.fromEntries(
    Object.entries(languageAlternates).map(([alternateLocale, path]) => [
      getHtmlLanguage(alternateLocale as Locale),
      absoluteUrl(siteUrl, path),
    ]),
  );
  const englishPath = languageAlternates[Locale.EN];
  if (englishPath !== undefined) {
    languages['x-default'] = absoluteUrl(siteUrl, englishPath);
  }
  const alternateLocales = Object.keys(languageAlternates)
    .filter((alternateLocale) => alternateLocale !== locale)
    .map((alternateLocale) => getOpenGraphLocale(alternateLocale as Locale));
  const imageUrl = absoluteUrl(siteUrl, OPEN_GRAPH_IMAGE_PATH);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages,
      types: {
        'application/rss+xml': `${siteUrl}/${locale}/feed.xml`,
      },
    },
    robots: {
      index: indexable,
      follow: indexable,
      noarchive: !indexable,
    },
    openGraph: {
      type: 'website',
      siteName: 'ClawAI',
      title,
      description,
      url: canonical,
      locale: getOpenGraphLocale(locale),
      alternateLocale: alternateLocales,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export async function buildRequestPublicPageMetadata(slug: string): Promise<Metadata> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  return buildPublicPageMetadata(slug, locale);
}
