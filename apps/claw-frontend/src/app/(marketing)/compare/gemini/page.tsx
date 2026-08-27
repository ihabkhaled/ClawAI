import type { Metadata } from 'next';

import { ComparisonPage } from '@/components/marketing/compare/comparison-page';
import { ComparisonRival } from '@/enums/comparison-rival.enum';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LaunchPublicPageSlug.COMPARE_GEMINI);
}

export default async function CompareGeminiPage(): Promise<React.ReactElement> {
  return ComparisonPage({ rival: ComparisonRival.GEMINI });
}
