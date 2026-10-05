import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';

import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { Locale } from '@/enums/locale.enum';
import { loadDictionary } from '@/lib/i18n/dictionary-loader';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import { getSiteUrl } from '@/lib/site/site-config';
import { listPublicThreadDiscoveries } from '@/lib/threads/public-thread-api';
import { isSupportedLocale } from '@/utilities/locale.utility';
import { serializeJsonLd } from '@/utilities/structured-data.utility';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('threads/discover');
}

export default async function ThreadDiscoveryPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(localeHeader) ? localeHeader : Locale.EN;
  const dictionary = await loadDictionary(locale);
  const items = await listPublicThreadDiscoveries(locale);
  const siteUrl = getSiteUrl();
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: dictionary.chat.threadDiscoveryTitle,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${siteUrl}/${locale}/threads/${item.slug}`,
        name: item.title,
      })),
    },
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold">{dictionary.chat.threadDiscoveryTitle}</h1>
      <p className="text-muted-foreground mt-3 max-w-3xl">
        {dictionary.chat.threadDiscoveryDescription}
      </p>
      <script type="application/ld+json">{serializeJsonLd(structuredData)}</script>
      {items.length === 0 ? (
        <p className="mt-8" role="status">
          {dictionary.chat.threadDiscoveryEmpty}
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.slug} className="border-border bg-card rounded-lg border p-5">
              <article>
                <h2 className="text-xl font-semibold">
                  <Link
                    href={`/${locale}/threads/${item.slug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.title}
                  </Link>
                </h2>
                <p className="text-muted-foreground mt-3">{item.excerpt}</p>
                <time
                  className="text-muted-foreground mt-4 block text-sm"
                  dateTime={item.publishedAt}
                >
                  {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                    new Date(item.publishedAt),
                  )}
                </time>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
