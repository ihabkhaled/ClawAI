import type { Metadata } from 'next';

import { ComparisonHubPage } from '@/components/marketing/compare/comparison-hub-page';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LaunchPublicPageSlug.COMPARE);
}

export default async function ComparePage(): Promise<React.ReactElement> {
  return ComparisonHubPage();
}
