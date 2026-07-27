import type { Metadata } from 'next';

import { PricingSection } from '@/components/marketing/home/pricing-section';
import { fetchPublicPricingCatalog } from '@/lib/pricing/public-pricing-api';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import { getSiteUrl } from '@/lib/site/site-config';
import { buildPricingJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('pricing');
}

export default async function PricingPage(): Promise<React.ReactElement> {
  const plans = await fetchPublicPricingCatalog();
  const canonicalUrl = new URL('/pricing', getSiteUrl()).toString();

  return (
    <>
      <script type="application/ld+json">
        {serializeJsonLd(buildPricingJsonLd(canonicalUrl, plans ?? []))}
      </script>
      <PricingSection initialPlans={plans} standalone />
    </>
  );
}
