import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ModelProviderPage as ModelProviderPageComponent } from '@/components/marketing/models/model-provider-page';
import {
  MODEL_PROVIDER_ORDER,
  getModelProviderSlug,
  isModelProviderPage,
} from '@/constants/models.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { ModelProviderRouteProps } from '@/types/models-route.types';

/**
 * One route file for all six provider pages (ADR-084). AWS Bedrock has no
 * page (F2/§6 — scaffolding only, no model sync); Qwen/Kimi/GLM have no
 * `ConnectorProvider` member and are refused (F6/§6). An unmatched segment
 * 404s rather than rendering an empty shell.
 */
export function generateStaticParams(): Array<{ provider: string }> {
  return MODEL_PROVIDER_ORDER.map((provider) => ({ provider }));
}

export async function generateMetadata({ params }: ModelProviderRouteProps): Promise<Metadata> {
  const { provider } = await params;
  if (!isModelProviderPage(provider)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getModelProviderSlug(provider));
}

export default async function ModelProviderRoute({
  params,
}: ModelProviderRouteProps): Promise<React.ReactElement> {
  const { provider } = await params;
  if (!isModelProviderPage(provider)) {
    notFound();
  }
  return ModelProviderPageComponent({ provider });
}
