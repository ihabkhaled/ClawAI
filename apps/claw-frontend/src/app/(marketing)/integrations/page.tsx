import type { Metadata } from 'next';

import { IntegrationHubPage } from '@/components/marketing/integrations/integration-hub-page';
import { MarketingVideoSection } from '@/components/marketing/shared/marketing-video-section';
import { INTEGRATIONS_HUB_SLUG } from '@/constants/integrations.constants';
import { MarketingVideoPlacement } from '@/enums/marketing-video-placement.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(INTEGRATIONS_HUB_SLUG);
}

export default async function IntegrationsPage(): Promise<React.ReactElement> {
  return (
    <>
      {await IntegrationHubPage()}
      <MarketingVideoSection placement={MarketingVideoPlacement.INTEGRATIONS} />
    </>
  );
}
