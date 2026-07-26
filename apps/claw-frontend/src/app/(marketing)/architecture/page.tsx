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
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
// Imported directly from its specific submodule rather than the `@/utilities`
// barrel — this is a server component, and the utilities barrel re-exports
// 150+ files; pulling the whole barrel into a server component's module graph
// is both a needless bundle-size hit and a risk of dragging a client-only
// dependency into the server bundle.
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('architecture');
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
