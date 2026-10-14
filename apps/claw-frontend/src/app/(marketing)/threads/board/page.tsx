import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Script from 'next/script';

import { GuestBoardPageView } from '@/components/threads/board/guest-board-page-view';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { THREADS_PUBLIC_BOARD_PATH } from '@/constants/thread-board-guest.constants';
import { THREAD_BOARD_ALL } from '@/constants/thread-board.constants';
import { THREADS_PUBLIC_BOARD_SLUG } from '@/constants/threads-public-board-seo.constants';
import { Locale } from '@/enums/locale.enum';
import { loadDictionary } from '@/lib/i18n/dictionary-loader';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import { getSiteUrl } from '@/lib/site/site-config';
import { getPublicBoardPage } from '@/lib/threads/public-board-api';
import type { PublicThreadsBoardPageProps } from '@/types/thread-board-view.types';
import { getPageBySlug } from '@/utilities/content-registry.utility';
import { isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildPublicBoardJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';
import { boardParamReader, isIndexableBoardView } from '@/utilities/thread-board-seo.utility';
import { parseBoardUrlState } from '@/utilities/thread-board-url-state.utility';

// Rendered per request (it reads the language and the URL), but the Board data itself is cached
// for a minute in the fetch layer, so a crawler or a spike of visitors costs one call a minute.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: PublicThreadsBoardPageProps): Promise<Metadata> {
  const metadata = await buildRequestPublicPageMetadata(THREADS_PUBLIC_BOARD_SLUG);
  return isIndexableBoardView(await searchParams)
    ? metadata
    : { ...metadata, robots: { index: false, follow: true } };
}

export default async function PublicThreadsBoardPage({
  searchParams,
}: PublicThreadsBoardPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const localeHeader = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(localeHeader) ? localeHeader : Locale.EN;
  const state = parseBoardUrlState(boardParamReader(await searchParams), THREAD_BOARD_ALL);
  const [dictionary, data] = await Promise.all([loadDictionary(locale), getPublicBoardPage(state)]);
  const siteUrl = getSiteUrl();
  const structuredData = buildPublicBoardJsonLd({
    name: dictionary.chat.threadPublicBoardTitle,
    description: dictionary.chat.threadPublicBoardSeoDescription,
    canonicalUrl: `${siteUrl}${localisePath(THREADS_PUBLIC_BOARD_PATH, locale)}`,
    language: locale,
    lastReviewed: getPageBySlug(THREADS_PUBLIC_BOARD_SLUG)?.lastReviewed ?? '',
    items: (data?.items ?? []).map((item) => ({
      name: item.title,
      url: `${siteUrl}/${item.contentLocale}/threads/${item.slug}`,
    })),
    totalItems: data?.meta.total ?? 0,
  });

  return (
    <>
      <Script id="threads-board-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {serializeJsonLd(structuredData)}
      </Script>
      <GuestBoardPageView initial={data === null ? undefined : { state, data }} />
    </>
  );
}
