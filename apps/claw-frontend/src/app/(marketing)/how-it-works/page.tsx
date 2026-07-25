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
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
// Imported directly from its specific submodule rather than the `@/utilities`
// barrel — this is a server component, and the barrel re-exports 150+ files;
// pulling it into a server component's module graph risks dragging a
// client-only dependency into the server bundle.
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('how-it-works');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonical = `${siteUrl}${entry?.canonicalPath ?? '/how-it-works'}`;
  const title = entry?.title === undefined || entry.title === '' ? 'How ClawAI Works' : entry.title;
  const description =
    entry?.description === undefined || entry.description === ''
      ? 'How ClawAI works: create an account, pick a plan, and reach every frontier AI model from one chat interface with automatic routing, multi-model orchestration, persistent context, and transparent cost-normalized usage allowances.'
      : entry.description;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: !noIndexEverything, follow: !noIndexEverything },
    openGraph: {
      type: 'website',
      siteName: 'ClawAI',
      title,
      description,
      url: canonical,
      locale: 'en_US',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
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
