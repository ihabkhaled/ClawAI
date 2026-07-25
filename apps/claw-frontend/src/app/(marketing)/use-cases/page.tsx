import type { Metadata } from 'next';

import { EnterpriseNoteSection } from '@/components/marketing/use-cases/enterprise-note-section';
import { OneSubscriptionSection } from '@/components/marketing/use-cases/one-subscription-section';
import { UseCasesCtaSection } from '@/components/marketing/use-cases/use-cases-cta-section';
import { UseCasesGridSection } from '@/components/marketing/use-cases/use-cases-grid-section';
import { UseCasesHeroSection } from '@/components/marketing/use-cases/use-cases-hero-section';
import { MARKETING_USE_CASES_PAGE_FALLBACK } from '@/constants/marketing-use-cases.constants';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
// Imported directly from its specific submodule rather than the `@/utilities`
// barrel — this is a server component, and the utilities barrel re-exports
// 150+ files; pulling the whole barrel into a server component's module graph
// is both a needless bundle-size hit and a risk of dragging a client-only
// dependency into the server bundle.
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('use-cases');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonical = `${siteUrl}${entry?.canonicalPath ?? MARKETING_USE_CASES_PAGE_FALLBACK.canonicalPath}`;
  // The registry entry for this slug is still PLANNED, so its title and
  // description are empty strings rather than null — `??` would not catch
  // them. Once the entry is PUBLISHED with real copy, the registry wins.
  const registryTitle = entry?.title ?? '';
  const registryDescription = entry?.description ?? '';
  const title = registryTitle === '' ? MARKETING_USE_CASES_PAGE_FALLBACK.title : registryTitle;
  const description =
    registryDescription === ''
      ? MARKETING_USE_CASES_PAGE_FALLBACK.description
      : registryDescription;

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
