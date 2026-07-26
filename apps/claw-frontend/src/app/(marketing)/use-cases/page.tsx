import type { Metadata } from 'next';

import { EnterpriseNoteSection } from '@/components/marketing/use-cases/enterprise-note-section';
import { OneSubscriptionSection } from '@/components/marketing/use-cases/one-subscription-section';
import { UseCasesCtaSection } from '@/components/marketing/use-cases/use-cases-cta-section';
import { UseCasesGridSection } from '@/components/marketing/use-cases/use-cases-grid-section';
import { UseCasesHeroSection } from '@/components/marketing/use-cases/use-cases-hero-section';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
// Imported directly from its specific submodule rather than the `@/utilities`
// barrel — this is a server component, and the utilities barrel re-exports
// 150+ files; pulling the whole barrel into a server component's module graph
// is both a needless bundle-size hit and a risk of dragging a client-only
// dependency into the server bundle.
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('use-cases');
}

export default function UseCasesPage(): React.ReactElement {
  const entry = getPageBySlug('use-cases');
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <UseCasesHeroSection lastReviewed={lastReviewed} />
      <UseCasesGridSection />
      <OneSubscriptionSection />
      <EnterpriseNoteSection />
      <UseCasesCtaSection />
    </>
  );
}
