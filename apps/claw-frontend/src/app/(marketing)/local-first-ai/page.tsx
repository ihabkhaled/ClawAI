import type { Metadata } from 'next';

import { EnterpriseAudienceSection } from '@/components/marketing/enterprise/enterprise-audience-section';
import { EnterpriseComparisonSection } from '@/components/marketing/enterprise/enterprise-comparison-section';
import { EnterpriseComplianceSection } from '@/components/marketing/enterprise/enterprise-compliance-section';
import { EnterpriseContactCtaSection } from '@/components/marketing/enterprise/enterprise-contact-cta-section';
import { EnterpriseDeploymentSection } from '@/components/marketing/enterprise/enterprise-deployment-section';
import { EnterpriseEngagementSection } from '@/components/marketing/enterprise/enterprise-engagement-section';
import { EnterpriseHeroSection } from '@/components/marketing/enterprise/enterprise-hero-section';
import { EnterpriseHybridSection } from '@/components/marketing/enterprise/enterprise-hybrid-section';
import { EnterpriseLocalModelsSection } from '@/components/marketing/enterprise/enterprise-local-models-section';
import {
  ENTERPRISE_PAGE_DESCRIPTION,
  ENTERPRISE_PAGE_TITLE,
} from '@/constants/marketing-enterprise.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
// Imported directly from their specific submodules rather than the
// `@/utilities` barrel — this is a server component, and the utilities
// barrel re-exports 150+ files; pulling the whole barrel into a server
// component's module graph is both a needless bundle-size hit and (per the
// same failure mode fixed in not-found.tsx and the root layout) a risk of
// dragging a client-only dependency into the server bundle and breaking
// the production build with "createContext is not a function".
import { getPageBySlug, isKnownPublicPath } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('local-first-ai');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonicalPath = entry?.canonicalPath ?? '/local-first-ai';
  const canonical = `${siteUrl}${canonicalPath}`;
  const registryTitle = entry?.title ?? '';
  const registryDescription = entry?.description ?? '';
  const title = registryTitle === '' ? ENTERPRISE_PAGE_TITLE : registryTitle;
  const description =
    registryDescription === '' ? ENTERPRISE_PAGE_DESCRIPTION : registryDescription;
  // The registry — not this file — decides indexability. If the slug is ever
  // rolled back to PLANNED, isKnownPublicPath() goes false and the page
  // declares itself noindex, matching the X-Robots-Tag backstop in middleware.
  const isIndexable = !noIndexEverything && isKnownPublicPath(canonicalPath);
  const ogImageUrl = `${siteUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: isIndexable,
      follow: isIndexable,
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
          alt: 'ClawAI on your infrastructure — private deployment for organisations',
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

export default function EnterpriseDeploymentPage(): React.ReactElement {
  const entry = getPageBySlug('local-first-ai');
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <EnterpriseHeroSection lastReviewed={lastReviewed} />
      <EnterpriseAudienceSection />
      <EnterpriseDeploymentSection />
      <EnterpriseLocalModelsSection />
      <EnterpriseHybridSection />
      <EnterpriseComparisonSection />
      <EnterpriseEngagementSection />
      <EnterpriseComplianceSection />
      <EnterpriseContactCtaSection />
    </>
  );
}
