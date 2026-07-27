import type { Metadata } from 'next';

import { PublicLaunchPage } from '@/components/marketing/shared/public-launch-page';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('security-and-privacy');
}

export default function SecurityAndPrivacyPage(): Promise<React.ReactElement> {
  return PublicLaunchPage({ slug: PublicLaunchPageSlug.SECURITY_AND_PRIVACY });
}
