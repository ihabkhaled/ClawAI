import type { Metadata } from 'next';

import { CodingAgentOverviewPage } from '@/components/marketing/coding-agent/coding-agent-overview-page';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LaunchPublicPageSlug.CODING_AGENT);
}

export default async function CodingAgentPage(): Promise<React.ReactElement> {
  return CodingAgentOverviewPage();
}
