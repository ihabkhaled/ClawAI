import type { Metadata } from 'next';

import { ModelHubPage } from '@/components/marketing/models/model-hub-page';
import { MarketingVideoSection } from '@/components/marketing/shared/marketing-video-section';
import { MODELS_HUB_SLUG } from '@/constants/models.constants';
import { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(MODELS_HUB_SLUG);
}

export default async function ModelsPage(): Promise<React.ReactElement> {
  return (
    <>
      {await ModelHubPage()}
      <MarketingVideoSection placement={MarketingVideoPlacement.MODEL_PROVIDERS} />
    </>
  );
}
