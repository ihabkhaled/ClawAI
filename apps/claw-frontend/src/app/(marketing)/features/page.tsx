import type { Metadata } from 'next';

import { FeaturesCtaSection } from '@/components/marketing/features/features-cta-section';
import { FeaturesFilesSection } from '@/components/marketing/features/features-files-section';
import { FeaturesGenerationSection } from '@/components/marketing/features/features-generation-section';
import { FeaturesHeroSection } from '@/components/marketing/features/features-hero-section';
import { FeaturesMemorySection } from '@/components/marketing/features/features-memory-section';
import { FeaturesObservabilitySection } from '@/components/marketing/features/features-observability-section';
import { FeaturesOrchestrationSection } from '@/components/marketing/features/features-orchestration-section';
import { FeaturesProvidersSection } from '@/components/marketing/features/features-providers-section';
import { FeaturesRoutingSection } from '@/components/marketing/features/features-routing-section';
import { FeaturesSecuritySection } from '@/components/marketing/features/features-security-section';
import { FeaturesWorkspaceSection } from '@/components/marketing/features/features-workspace-section';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
// Imported from their specific submodules rather than the `@/utilities`
// barrel — this is a server component, and pulling the whole barrel into a
// server component's module graph risks dragging client-only code into the
// server bundle (the "createContext is not a function" build failure).
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('features');
}

export default function FeaturesPage(): React.ReactElement {
  const entry = getPageBySlug('features');
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <FeaturesHeroSection lastReviewed={lastReviewed} />
      <FeaturesProvidersSection />
      <FeaturesRoutingSection />
      <FeaturesOrchestrationSection />
      <FeaturesMemorySection />
      <FeaturesFilesSection />
      <FeaturesWorkspaceSection />
      <FeaturesGenerationSection />
      <FeaturesObservabilitySection />
      <FeaturesSecuritySection />
      <FeaturesCtaSection />
    </>
  );
}
