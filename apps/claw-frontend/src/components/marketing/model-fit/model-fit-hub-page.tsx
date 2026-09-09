import { headers } from 'next/headers';

import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { ModelFitHubCards } from '@/components/marketing/model-fit/model-fit-hub-cards';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  MODEL_FIT_HUB_PATH,
  MODEL_FIT_HUB_SLUG,
  MODEL_FIT_REVIEW_DATE,
} from '@/constants/model-fit.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildModelFitHubCards, getModelFitContent } from '@/utilities/model-fit.utility';
import { buildLearnHubJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function ModelFitHubPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { hub, labels } = getModelFitContent(locale);
  const cards = buildModelFitHubCards(locale);
  const registryEntry = getPageBySlugAndLocale(MODEL_FIT_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(localisePath(MODEL_FIT_HUB_PATH, locale), siteUrl).toString();
  const title = registryEntry?.title ?? hub.title;
  const summary = registryEntry?.description ?? hub.summary;

  // buildLearnHubJsonLd is generic over any collection-page hub — CollectionPage
  // + BreadcrumbList + ItemList applies equally to a list of task pages.
  const jsonLd = buildLearnHubJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? MODEL_FIT_REVIEW_DATE,
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
            <time dateTime={MODEL_FIT_REVIEW_DATE}>{MODEL_FIT_REVIEW_DATE}</time>
          </p>

          <ComparisonSection id="tasks" title={hub.topicsHeading}>
            <ModelFitHubCards cards={cards} />
          </ComparisonSection>
        </div>
      </EditorialPageShell>
    </>
  );
}
