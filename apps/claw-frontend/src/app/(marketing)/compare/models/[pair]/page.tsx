import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CompareModelsPairPage as CompareModelsPairPageComponent } from '@/components/marketing/compare-models/compare-models-pair-page';
import {
  MODEL_FAMILY_PAIR_ORDER,
  getModelFamilyPairSlug,
  isModelFamilyPair,
} from '@/constants/compare-models.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { CompareModelsPairRouteProps } from '@/types/compare-models-route.types';

/**
 * One route file for all six pair pages (ADR-084), mirroring the
 * `/model-fit/[task]` pattern. An unmatched segment 404s rather than
 * rendering an empty shell.
 */
export function generateStaticParams(): Array<{ pair: string }> {
  return MODEL_FAMILY_PAIR_ORDER.map((pair) => ({ pair }));
}

export async function generateMetadata({ params }: CompareModelsPairRouteProps): Promise<Metadata> {
  const { pair } = await params;
  if (!isModelFamilyPair(pair)) {
    return {};
  }
  return buildRequestPublicPageMetadata(getModelFamilyPairSlug(pair));
}

export default async function CompareModelsPairRoute({
  params,
}: CompareModelsPairRouteProps): Promise<React.ReactElement> {
  const { pair } = await params;
  if (!isModelFamilyPair(pair)) {
    notFound();
  }
  return CompareModelsPairPageComponent({ pair });
}
