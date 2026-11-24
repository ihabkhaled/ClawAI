import type { Metadata } from 'next';

import { LiveIntelligencePlatformsPage } from '@/components/marketing/live-intelligence/live-intelligence-platforms-page';
import { LIVE_INTELLIGENCE_PLATFORMS_SLUG } from '@/constants/live-intelligence-marketing.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LIVE_INTELLIGENCE_PLATFORMS_SLUG);
}

export default async function LiveIntelligencePlatformsMarketingPage(): Promise<React.ReactElement> {
  return LiveIntelligencePlatformsPage();
}
