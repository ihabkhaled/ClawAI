import type { Metadata } from 'next';

import { CompareModelsHubPage } from '@/components/marketing/compare-models/compare-models-hub-page';
import { COMPARE_MODELS_HUB_SLUG } from '@/constants/compare-models.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(COMPARE_MODELS_HUB_SLUG);
}

export default function CompareModelsPage(): Promise<React.ReactElement> {
  return CompareModelsHubPage();
}
