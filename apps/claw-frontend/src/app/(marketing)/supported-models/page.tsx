import type { Metadata } from 'next';

import { MarketingVideoSection } from '@/components/marketing/shared/marketing-video-section';
import { PublicLaunchPage } from '@/components/marketing/shared/public-launch-page';
import { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('supported-models');
}

export default async function SupportedModelsPage(): Promise<React.ReactElement> {
  return (
    <>
      {await PublicLaunchPage({ slug: PublicLaunchPageSlug.SUPPORTED_MODELS })}
      <MarketingVideoSection placement={MarketingVideoPlacement.SUPPORTED_MODELS} />
    </>
  );
}
