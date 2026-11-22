import type { Metadata } from 'next';

import { PublicLaunchPage } from '@/components/marketing/shared/public-launch-page';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(PublicLaunchPageSlug.DELIVERY_SHIPPING);
}

export default function DeliveryShippingPage(): Promise<React.ReactElement> {
  return PublicLaunchPage({ slug: PublicLaunchPageSlug.DELIVERY_SHIPPING });
}
