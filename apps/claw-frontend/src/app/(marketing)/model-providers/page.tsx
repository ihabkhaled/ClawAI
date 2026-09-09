import type { Metadata } from 'next';

import { ModelHubPage } from '@/components/marketing/models/model-hub-page';
import { MODELS_HUB_SLUG } from '@/constants/models.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(MODELS_HUB_SLUG);
}

export default function ModelsPage(): Promise<React.ReactElement> {
  return ModelHubPage();
}
