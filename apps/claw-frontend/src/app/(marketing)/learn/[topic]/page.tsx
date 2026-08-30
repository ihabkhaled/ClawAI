import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { LearnTopicPage } from '@/components/marketing/learn/learn-topic-page';
import { LEARN_TOPIC_ORDER, getLearnTopicSlug, isLearnTopic } from '@/constants/learn.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { LearnTopicRouteProps } from '@/types/learn-route.types';

/**
 * One route file for all eighteen explainers (ADR-084).
 *
 * `generateStaticParams` enumerates the order array, so the route knows its own
 * children and `sitemap-coverage.test.ts` can expand this segment into the same
 * paths the registry publishes. Anything not in the array is a 404 rather than
 * an empty page — an unmatched segment must never render a shell with no copy,
 * because that is an indexable blank page.
 */
export function generateStaticParams(): Array<{ topic: string }> {
  return LEARN_TOPIC_ORDER.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: LearnTopicRouteProps): Promise<Metadata> {
  const { topic } = await params;
  if (!isLearnTopic(topic)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getLearnTopicSlug(topic));
}

export default async function LearnTopicRoute({
  params,
}: LearnTopicRouteProps): Promise<React.ReactElement> {
  const { topic } = await params;
  if (!isLearnTopic(topic)) {
    notFound();
  }
  return LearnTopicPage({ topic });
}
