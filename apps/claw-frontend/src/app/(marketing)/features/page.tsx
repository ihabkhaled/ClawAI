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
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities`
// barrel — this is a server component, and pulling the whole barrel into a
// server component's module graph risks dragging client-only code into the
// server bundle (the "createContext is not a function" build failure).
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('features');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonical = `${siteUrl}${entry?.canonicalPath ?? '/features'}`;
  const title = entry?.title ?? 'ClawAI Features';
  const description = entry?.description ?? '';
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
          alt: 'ClawAI — one subscription, every frontier model',
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
