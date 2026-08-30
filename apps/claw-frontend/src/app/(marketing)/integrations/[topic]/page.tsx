import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { IntegrationTopicPage } from '@/components/marketing/integrations/integration-topic-page';
import {
  INTEGRATION_TOPIC_ORDER,
  getIntegrationSlug,
  isIntegrationTopic,
} from '@/constants/integrations.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { IntegrationTopicRouteProps } from '@/types/integrations-route.types';

/** One route file for all fourteen connectors (ADR-084). */
export function generateStaticParams(): Array<{ topic: string }> {
  return INTEGRATION_TOPIC_ORDER.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: IntegrationTopicRouteProps): Promise<Metadata> {
  const { topic } = await params;
  if (!isIntegrationTopic(topic)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getIntegrationSlug(topic));
}

export default async function IntegrationTopicRoute({
  params,
}: IntegrationTopicRouteProps): Promise<React.ReactElement> {
  const { topic } = await params;
  if (!isIntegrationTopic(topic)) {
    notFound();
  }
  return IntegrationTopicPage({ topic });
}
