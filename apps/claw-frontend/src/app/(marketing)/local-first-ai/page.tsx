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
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
// Imported directly from their specific submodules rather than the
// `@/utilities` barrel — this is a server component, and the utilities
// barrel re-exports 150+ files; pulling the whole barrel into a server
// component's module graph is both a needless bundle-size hit and (per the
// same failure mode fixed in not-found.tsx and the root layout) a risk of
// dragging a client-only dependency into the server bundle and breaking
// the production build with "createContext is not a function".
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('local-first-ai');
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
