import type { Metadata } from 'next';

import { ArchitectureCtaSection } from '@/components/marketing/architecture/architecture-cta-section';
import { ArchitectureDataLayerSection } from '@/components/marketing/architecture/architecture-data-layer-section';
import { ArchitectureDataOwnershipSection } from '@/components/marketing/architecture/architecture-data-ownership-section';
import { ArchitectureEnterpriseSection } from '@/components/marketing/architecture/architecture-enterprise-section';
import { ArchitectureEventsSection } from '@/components/marketing/architecture/architecture-events-section';
import { ArchitectureLifecycleSection } from '@/components/marketing/architecture/architecture-lifecycle-section';
import { ArchitectureObservabilitySection } from '@/components/marketing/architecture/architecture-observability-section';
import { ArchitectureOverviewSection } from '@/components/marketing/architecture/architecture-overview-section';
import { ArchitectureReliabilitySection } from '@/components/marketing/architecture/architecture-reliability-section';
import { ArchitectureSecuritySection } from '@/components/marketing/architecture/architecture-security-section';
import { ArchitectureServicesSection } from '@/components/marketing/architecture/architecture-services-section';
import { ArchitectureStreamingSection } from '@/components/marketing/architecture/architecture-streaming-section';
import { MarketingPageHero } from '@/components/marketing/shared/marketing-page-hero';
import {
  MARKETING_ARCHITECTURE_CANONICAL_PATH,
  MARKETING_ARCHITECTURE_FALLBACK_DESCRIPTION,
  MARKETING_ARCHITECTURE_FALLBACK_TITLE,
  MARKETING_ARCHITECTURE_OG_IMAGE_ALT,
} from '@/constants/marketing-architecture.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
// Imported directly from its specific submodule rather than the `@/utilities`
// barrel — this is a server component, and the utilities barrel re-exports
// 150+ files; pulling the whole barrel into a server component's module graph
// is both a needless bundle-size hit and a risk of dragging a client-only
// dependency into the server bundle.
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('architecture');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonical = `${siteUrl}${entry?.canonicalPath ?? MARKETING_ARCHITECTURE_CANONICAL_PATH}`;
  // The registry entry exists before it is published, but with empty
  // title/description — fall back until this slug flips to PUBLISHED so the
  // document head is never blank.
  const registryTitle = entry?.title ?? '';
  const registryDescription = entry?.description ?? '';
  const title = registryTitle === '' ? MARKETING_ARCHITECTURE_FALLBACK_TITLE : registryTitle;
  const description =
    registryDescription === '' ? MARKETING_ARCHITECTURE_FALLBACK_DESCRIPTION : registryDescription;
  const ogImageUrl = `${siteUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: !noIndexEverything,
      follow: !noIndexEverything,
    },
    openGraph: {
      type: 'website',
      siteName: 'ClawAI',
      title,
      description,
      url: canonical,
      locale: 'en_US',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: MARKETING_ARCHITECTURE_OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function ArchitecturePage(): React.ReactElement {
  const entry = getPageBySlug('architecture');
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <MarketingPageHero
        titleKey="marketing.architecturePage.hero.title"
        subtitleKey="marketing.architecturePage.hero.subtitle"
        lastReviewed={lastReviewed}
      />
      <ArchitectureOverviewSection />
      <ArchitectureServicesSection />
      <ArchitectureDataOwnershipSection />
      <ArchitectureLifecycleSection />
      <ArchitectureEventsSection />
      <ArchitectureStreamingSection />
      <ArchitectureDataLayerSection />
      <ArchitectureSecuritySection />
      <ArchitectureObservabilitySection />
      <ArchitectureReliabilitySection />
      <ArchitectureEnterpriseSection />
      <ArchitectureCtaSection />
    </>
  );
}
