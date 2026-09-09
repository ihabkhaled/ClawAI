import type { Metadata } from 'next';

import { ModelFitHubPage } from '@/components/marketing/model-fit/model-fit-hub-page';
import { MODEL_FIT_HUB_SLUG } from '@/constants/model-fit.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(MODEL_FIT_HUB_SLUG);
}

export default function ModelFitPage(): Promise<React.ReactElement> {
  return ModelFitHubPage();
}
