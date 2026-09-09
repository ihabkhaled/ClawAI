import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FeatureCapabilityPage as FeatureCapabilityPageComponent } from '@/components/marketing/features/feature-capability-page';
import {
  FEATURES_CAPABILITY_ORDER,
  getFeatureCapabilitySlug,
  isFeatureCapability,
} from '@/constants/features-cluster.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { FeatureCapabilityRouteProps } from '@/types/features-route.types';

/**
 * One route file for all six capability pages (ADR-084), mirroring the
 * `/use-cases/[task]` pattern. An unmatched segment 404s rather than
 * rendering an empty shell.
 */
export function generateStaticParams(): Array<{ capability: string }> {
  return FEATURES_CAPABILITY_ORDER.map((capability) => ({ capability }));
}

export async function generateMetadata({ params }: FeatureCapabilityRouteProps): Promise<Metadata> {
  const { capability } = await params;
  if (!isFeatureCapability(capability)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getFeatureCapabilitySlug(capability));
}

export default async function FeatureCapabilityRoute({
  params,
}: FeatureCapabilityRouteProps): Promise<React.ReactElement> {
  const { capability } = await params;
  if (!isFeatureCapability(capability)) {
    notFound();
  }
  return FeatureCapabilityPageComponent({ capability });
}
