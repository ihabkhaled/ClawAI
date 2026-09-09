import type { Metadata } from 'next';

import { EnterpriseNoteSection } from '@/components/marketing/use-cases/enterprise-note-section';
import { OneSubscriptionSection } from '@/components/marketing/use-cases/one-subscription-section';
import { UseCasesCtaSection } from '@/components/marketing/use-cases/use-cases-cta-section';
import { UseCasesGridSection } from '@/components/marketing/use-cases/use-cases-grid-section';
import { UseCasesHeroSection } from '@/components/marketing/use-cases/use-cases-hero-section';
import { UseCasesTaskCardsSection } from '@/components/marketing/use-cases/use-cases-task-cards-section';
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

// `/use-cases` becomes a hub here (F4 of the SEO content architecture doc):
// same URL, no redirect, no lost equity. The existing hero/grid/CTA sections
// are unchanged; `UseCasesTaskCardsSection` is the only addition, linking to
// the 7 new `/use-cases/<task>` pages this batch adds.
export default async function UseCasesPage(): Promise<React.ReactElement> {
  const entry = getPageBySlug('use-cases');
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <UseCasesHeroSection lastReviewed={lastReviewed} />
      <UseCasesGridSection />
      <UseCasesTaskCardsSection />
      <OneSubscriptionSection />
      <EnterpriseNoteSection />
      <UseCasesCtaSection />
    </>
  );
}
