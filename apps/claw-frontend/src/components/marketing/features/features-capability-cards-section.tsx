import { headers } from 'next/headers';

import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { FeatureCapabilityCards } from '@/components/marketing/features/feature-capability-cards';
import { FEATURES_HUB_PATH, FEATURES_REVIEW_DATE } from '@/constants/features-cluster.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import {
  buildFeatureCapabilityCards,
  getFeaturesClusterContent,
} from '@/utilities/features-cluster.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnHubJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

/**
 * Turns the existing `/features` page into a hub for the 6 new capability
 * pages (F4 of the SEO content architecture doc: same URL, no redirect, no
 * lost equity — this is a new section added to the existing page, not a
 * replacement of it). Cards below the nine existing sections, so the page
 * keeps its existing above-the-fold identity and gains a "go deeper" section,
 * mirroring `UseCasesTaskCardsSection`.
 */
export async function FeaturesCapabilityCardsSection(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { hub } = getFeaturesClusterContent(locale);
  const cards = buildFeatureCapabilityCards(locale);
  const registryEntry = getPageBySlugAndLocale('features', locale);

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(localisePath(FEATURES_HUB_PATH, locale), siteUrl).toString();
  const name = registryEntry?.title ?? hub.capabilitiesHeading;
  const description = registryEntry?.description ?? hub.capabilitiesIntro;

  // buildLearnHubJsonLd is generic over any collection-page hub — CollectionPage
  // + BreadcrumbList + ItemList applies equally to a list of capability pages.
  const jsonLd = buildLearnHubJsonLd({
    name,
    description,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? FEATURES_REVIEW_DATE,
    items: cards.map((card) => ({
      name: card.title,
      url: new URL(card.href, siteUrl).toString(),
    })),
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <div className="editorial-comparison mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <ComparisonSection id="feature-capabilities" title={hub.capabilitiesHeading}>
          <p className="editorial-comparison__body">{hub.capabilitiesIntro}</p>
          <FeatureCapabilityCards cards={cards} />
        </ComparisonSection>
      </div>
    </>
  );
}
