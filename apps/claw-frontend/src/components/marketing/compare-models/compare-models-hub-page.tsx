import { headers } from 'next/headers';

import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { CompareModelsHubCards } from '@/components/marketing/compare-models/compare-models-hub-cards';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import {
  COMPARE_MODELS_HUB_PATH,
  COMPARE_MODELS_HUB_SLUG,
  COMPARE_MODELS_REVIEW_DATE,
} from '@/constants/compare-models.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import {
  buildCompareModelsHubCards,
  getCompareModelsContent,
} from '@/utilities/compare-models.utility';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnHubJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function CompareModelsHubPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { hub, labels } = getCompareModelsContent(locale);
  const cards = buildCompareModelsHubCards(locale);
  const registryEntry = getPageBySlugAndLocale(COMPARE_MODELS_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(localisePath(COMPARE_MODELS_HUB_PATH, locale), siteUrl).toString();
  const title = registryEntry?.title ?? hub.title;
  const summary = registryEntry?.description ?? hub.summary;

  // buildLearnHubJsonLd is generic over any collection-page hub — CollectionPage
  // + BreadcrumbList + ItemList applies equally to a list of pair pages.
  const jsonLd = buildLearnHubJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? COMPARE_MODELS_REVIEW_DATE,
    items: cards.map((card) => ({
      name: card.title,
      url: new URL(card.href, siteUrl).toString(),
    })),
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell eyebrow={hub.eyebrow} title={title} summary={summary}>
        <div className="editorial-comparison">
          <p className="editorial-comparison__stamp">
            {labels.lastReviewed}:{' '}
            <time dateTime={COMPARE_MODELS_REVIEW_DATE}>{COMPARE_MODELS_REVIEW_DATE}</time>
          </p>

          <ComparisonSection id="pairs" title={hub.pairsHeading}>
            <CompareModelsHubCards cards={cards} />
          </ComparisonSection>
        </div>
      </EditorialPageShell>
    </>
  );
}
