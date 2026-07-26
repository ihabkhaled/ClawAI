import type { Metadata } from 'next';

import { AccountAndPlansSection } from '@/components/marketing/how-it-works/account-and-plans-section';
import { AllowanceSection } from '@/components/marketing/how-it-works/allowance-section';
import { ContextSection } from '@/components/marketing/how-it-works/context-section';
import { EnterpriseNoteSection } from '@/components/marketing/how-it-works/enterprise-note-section';
import { HowItWorksCtaSection } from '@/components/marketing/how-it-works/how-it-works-cta-section';
import { HowItWorksHeroSection } from '@/components/marketing/how-it-works/how-it-works-hero-section';
import { JourneyStepsSection } from '@/components/marketing/how-it-works/journey-steps-section';
import { ModelAccessSection } from '@/components/marketing/how-it-works/model-access-section';
import { OrchestrationSection } from '@/components/marketing/how-it-works/orchestration-section';
import { RoutingDecidesSection } from '@/components/marketing/how-it-works/routing-decides-section';
import { TransparencySection } from '@/components/marketing/how-it-works/transparency-section';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
// Imported directly from its specific submodule rather than the `@/utilities`
// barrel — this is a server component, and the barrel re-exports 150+ files;
// pulling it into a server component's module graph risks dragging a
// client-only dependency into the server bundle.
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('how-it-works');
}

export default function HowItWorksPage(): React.ReactElement {
  const entry = getPageBySlug('how-it-works');
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <HowItWorksHeroSection lastReviewed={lastReviewed} />
      <JourneyStepsSection />
      <AccountAndPlansSection />
      <ModelAccessSection />
      <RoutingDecidesSection />
      <OrchestrationSection />
      <ContextSection />
      <TransparencySection />
      <AllowanceSection />
      <EnterpriseNoteSection />
      <HowItWorksCtaSection />
    </>
  );
}
