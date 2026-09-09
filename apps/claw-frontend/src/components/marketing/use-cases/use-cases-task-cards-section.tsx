import { headers } from 'next/headers';

import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { UseCaseHubCards } from '@/components/marketing/use-cases/use-case-hub-cards';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { USE_CASES_HUB_PATH, USE_CASES_REVIEW_DATE } from '@/constants/use-cases-cluster.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnHubJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';
import {
  buildUseCaseHubCards,
  getUseCasesClusterContent,
} from '@/utilities/use-cases-cluster.utility';

/**
 * Turns the existing `/use-cases` page into a hub for the 7 new task pages
 * (F4 of the SEO content architecture doc: same URL, no redirect, no lost
 * equity — this is a new section added to the existing page, not a
 * replacement of it). Cards below the legacy grid, so the page keeps its
 * existing above-the-fold identity and gains a "go deeper" section.
 */
export async function UseCasesTaskCardsSection(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { hub } = getUseCasesClusterContent(locale);
  const cards = buildUseCaseHubCards(locale);
  const registryEntry = getPageBySlugAndLocale('use-cases', locale);

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(localisePath(USE_CASES_HUB_PATH, locale), siteUrl).toString();
  const name = registryEntry?.title ?? hub.tasksHeading;
  const description = registryEntry?.description ?? hub.tasksIntro;

  // buildLearnHubJsonLd is generic over any collection-page hub — CollectionPage
  // + BreadcrumbList + ItemList applies equally to a list of task pages.
  const jsonLd = buildLearnHubJsonLd({
    name,
    description,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? USE_CASES_REVIEW_DATE,
    items: cards.map((card) => ({
      name: card.title,
      url: new URL(card.href, siteUrl).toString(),
    })),
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <div className="editorial-comparison mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <ComparisonSection id="use-case-tasks" title={hub.tasksHeading}>
          <p className="editorial-comparison__body">{hub.tasksIntro}</p>
          <UseCaseHubCards cards={cards} />
        </ComparisonSection>
      </div>
    </>
  );
}
