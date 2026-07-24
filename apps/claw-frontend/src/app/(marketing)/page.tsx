import type { Metadata } from 'next';

import { ArchitectureSection } from '@/components/marketing/home/architecture-section';
import { CtaSection } from '@/components/marketing/home/cta-section';
import { FaqSection } from '@/components/marketing/home/faq-section';
import { FeaturesSection } from '@/components/marketing/home/features-section';
import { HeroSection } from '@/components/marketing/home/hero-section';
import { HowItWorksSection } from '@/components/marketing/home/how-it-works-section';
import { IntegrationsSection } from '@/components/marketing/home/integrations-section';
import { LocalFirstSection } from '@/components/marketing/home/local-first-section';
import { RoutingSection } from '@/components/marketing/home/routing-section';
import { SecuritySection } from '@/components/marketing/home/security-section';
import { SelfHostingSection } from '@/components/marketing/home/self-hosting-section';
import { UseCasesSection } from '@/components/marketing/home/use-cases-section';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
// Imported directly from their specific submodules rather than the
// `@/utilities` barrel — this is a server component, and the utilities
// barrel re-exports 150+ files; pulling the whole barrel into a server
// component's module graph is both a needless bundle-size hit and (per the
// same failure mode fixed in not-found.tsx and the root layout) a risk of
// dragging a client-only dependency into the server bundle and breaking
// the production build with "createContext is not a function".
import { getPageBySlug } from '@/utilities/content-registry.utility';
import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebsiteJsonLd,
  serializeJsonLd,
} from '@/utilities/structured-data.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('home');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonical = `${siteUrl}${entry?.canonicalPath ?? '/'}`;
  const title = entry?.title ?? 'ClawAI';
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
          alt: 'ClawAI — local-first AI orchestration',
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

export default function HomePage(): React.ReactElement {
  const entry = getPageBySlug('home');
  const siteUrl = getSiteUrl();
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(buildWebsiteJsonLd(siteUrl))}</script>
      <script type="application/ld+json">
        {serializeJsonLd(buildOrganizationJsonLd(siteUrl))}
      </script>
      <script type="application/ld+json">
        {serializeJsonLd(buildSoftwareApplicationJsonLd(siteUrl))}
      </script>

      <HeroSection lastReviewed={lastReviewed} />
      <LocalFirstSection />
      <RoutingSection />
      <HowItWorksSection />
      <FeaturesSection />
      <IntegrationsSection />
      <ArchitectureSection />
      <SelfHostingSection />
      <SecuritySection />
      <UseCasesSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
