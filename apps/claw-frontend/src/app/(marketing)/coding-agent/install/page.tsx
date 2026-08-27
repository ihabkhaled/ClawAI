import type { Metadata } from 'next';

import { CodingAgentInstallPage } from '@/components/marketing/coding-agent/coding-agent-install-page';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LaunchPublicPageSlug.CODING_AGENT_INSTALL);
}

export default async function CodingAgentInstallRoute(): Promise<React.ReactElement> {
  return CodingAgentInstallPage();
}
