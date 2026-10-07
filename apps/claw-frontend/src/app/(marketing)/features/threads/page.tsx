import type { Metadata } from 'next';

import { ThreadsOverviewPage } from '@/components/marketing/threads/threads-overview-page';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LaunchPublicPageSlug.THREADS);
}

export default async function ThreadsMarketingPage(): Promise<React.ReactElement> {
  return ThreadsOverviewPage();
}
