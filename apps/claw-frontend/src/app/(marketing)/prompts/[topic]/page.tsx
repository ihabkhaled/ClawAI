import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PromptGuideTopicPage as PromptGuideTopicPageComponent } from '@/components/marketing/prompts/prompt-guide-topic-page';
import {
  PROMPT_GUIDE_TOPIC_ORDER,
  getPromptGuideTopicSlug,
  isPromptGuideTopic,
} from '@/constants/prompts.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { PromptGuideTopicRouteProps } from '@/types/prompt-guide-route.types';

/**
 * One route file for all seven topic pages (ADR-084), mirroring the
 * `/model-fit/[task]` pattern. An unmatched segment 404s rather than
 * rendering an empty shell.
 */
export function generateStaticParams(): Array<{ topic: string }> {
  return PROMPT_GUIDE_TOPIC_ORDER.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: PromptGuideTopicRouteProps): Promise<Metadata> {
  const { topic } = await params;
  if (!isPromptGuideTopic(topic)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getPromptGuideTopicSlug(topic));
}

export default async function PromptGuideTopicRoute({
  params,
}: PromptGuideTopicRouteProps): Promise<React.ReactElement> {
  const { topic } = await params;
  if (!isPromptGuideTopic(topic)) {
    notFound();
  }
  return PromptGuideTopicPageComponent({ topic });
}
