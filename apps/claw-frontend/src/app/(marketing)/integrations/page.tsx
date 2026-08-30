import type { Metadata } from 'next';

import { IntegrationHubPage } from '@/components/marketing/integrations/integration-hub-page';
import { INTEGRATIONS_HUB_SLUG } from '@/constants/integrations.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(INTEGRATIONS_HUB_SLUG);
}

export default function IntegrationsPage(): Promise<React.ReactElement> {
  return IntegrationHubPage();
}
