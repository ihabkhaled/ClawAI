import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';

import { getSiteUrl, isProductionCanonical, shouldNoIndexEverything } from '@/lib/site/site-config';
import { loadPublicThreadFromParams } from '@/lib/threads/public-thread-page-data';
import {
  buildThreadArticleJsonLd,
  buildThreadDescription,
  serializeJsonLd,
} from '@/utilities/structured-data.utility';
import { threadCanonicalUrl } from '@/utilities/thread-slug.utility';

import { ThreadPublicPageClient } from './page-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const publication = await loadPublicThreadFromParams(params);
  if (!publication || shouldNoIndexEverything()) {
    return { robots: { index: false, follow: false } };
  }
  const canonical = threadCanonicalUrl(getSiteUrl(), publication.contentLocale, publication.slug);
  return {
    title: publication.title,
    description: buildThreadDescription(publication.content.markdown),
    alternates: {
      canonical,
      languages: { [publication.contentLocale]: canonical, 'x-default': canonical },
    },
    robots: isProductionCanonical()
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title: publication.title,
      description: publication.title,
      url: canonical,
      type: 'article',
    },
  };
}

export default async function PublicThreadPublicationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const publication = await loadPublicThreadFromParams(params);
  if (!publication) {
    notFound();
  }
  const jsonLd = buildThreadArticleJsonLd({
    canonicalUrl: threadCanonicalUrl(getSiteUrl(), publication.contentLocale, publication.slug),
    title: publication.title,
    description: buildThreadDescription(publication.content.markdown),
    publishedAt: publication.publishedAt,
    language: publication.contentLocale,
    sourceUrls: publication.content.citations.map(({ url }) => url),
  });
  return (
    <>
      <Script id="thread-article-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {serializeJsonLd(jsonLd)}
      </Script>
      <ThreadPublicPageClient initialPublication={publication} />
    </>
  );
}
