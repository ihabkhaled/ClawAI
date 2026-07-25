import type { Metadata } from 'next';

import { CtaSection } from '@/components/marketing/home/cta-section';
import { EnterpriseBandSection } from '@/components/marketing/home/enterprise-band-section';
import { FeaturesSection } from '@/components/marketing/home/features-section';
import { HeroSection } from '@/components/marketing/home/hero-section';
import { HowItWorksSection } from '@/components/marketing/home/how-it-works-section';
import { ModelRosterSection } from '@/components/marketing/home/model-roster-section';
import { PricingSection } from '@/components/marketing/home/pricing-section';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/constants/site-metadata.constants';
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
  const title = entry?.title ?? SITE_TITLE;
  const description = entry?.description ?? SITE_DESCRIPTION;
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
          alt: 'ClawAI — every frontier AI model on one subscription',
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

// The home page is a SUMMARY and an entry point to a paid account: what you
// get (the model roster), what it costs (the plan ladder), how it works, a
// features teaser, and one clearly separated band for organisations that want
// an on-premise deployment. Every topic links out to its own dedicated page —
// long-form content lives there, not here.
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
      <ModelRosterSection />
      <PricingSection />
      <HowItWorksSection />
      <FeaturesSection />
      <EnterpriseBandSection />
      <CtaSection />
    </>
  );
}
