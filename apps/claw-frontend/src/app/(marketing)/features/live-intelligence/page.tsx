import type { Metadata } from 'next';

import { LiveIntelligenceOverviewPage } from '@/components/marketing/live-intelligence/live-intelligence-overview-page';
import { LIVE_INTELLIGENCE_SLUG } from '@/constants/live-intelligence-marketing.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LIVE_INTELLIGENCE_SLUG);
}

export default async function LiveIntelligenceMarketingPage(): Promise<React.ReactElement> {
  return LiveIntelligenceOverviewPage();
}
