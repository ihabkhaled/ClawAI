import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getSiteUrl, isProductionCanonical, shouldNoIndexEverything } from '@/lib/site/site-config';
import { getPublicThreadPublication } from '@/lib/threads/public-thread-api';

import { ThreadPublicPageClient } from './page-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const publication = await getPublicThreadPublication(slug);
  if (!publication || shouldNoIndexEverything()) {
    return { robots: { index: false, follow: false } };
  }
  const canonical = `${getSiteUrl()}/${publication.contentLocale}/threads/${publication.slug}`;
  return {
    title: publication.title,
    description: publication.content.markdown
      .replaceAll(/^#{1,6}\s+.*$/gmu, '')
      .replaceAll(/\s+/gu, ' ')
      .trim()
      .slice(0, 160),
    alternates: { canonical },
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
  const { slug } = await params;
  const publication = await getPublicThreadPublication(slug);
  if (!publication) {
    notFound();
  }
  return <ThreadPublicPageClient initialPublication={publication} />;
}
