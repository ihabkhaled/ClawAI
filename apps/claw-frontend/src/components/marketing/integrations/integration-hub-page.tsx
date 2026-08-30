import { headers } from 'next/headers';

import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { IntegrationHubCards } from '@/components/marketing/integrations/integration-hub-cards';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import {
  INTEGRATIONS_HUB_PATH,
  INTEGRATIONS_HUB_SLUG,
  INTEGRATIONS_REVIEW_DATE,
} from '@/constants/integrations.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { buildIntegrationHubCards, getIntegrationsContent } from '@/utilities/integrations.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnHubJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function IntegrationHubPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { hub, labels } = getIntegrationsContent(locale);
  const cards = buildIntegrationHubCards(locale);
  const registryEntry = getPageBySlugAndLocale(INTEGRATIONS_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(localisePath(INTEGRATIONS_HUB_PATH, locale), siteUrl).toString();
  const title = registryEntry?.title ?? hub.title;
  const summary = registryEntry?.description ?? hub.summary;

  // buildLearnHubJsonLd is generic over any collection-page hub — CollectionPage
  // + BreadcrumbList + ItemList applies equally to a list of connectors.
  const jsonLd = buildLearnHubJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? INTEGRATIONS_REVIEW_DATE,
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
            <time dateTime={INTEGRATIONS_REVIEW_DATE}>{INTEGRATIONS_REVIEW_DATE}</time>
          </p>

          <ComparisonSection id="connectors" title={hub.topicsHeading}>
            <IntegrationHubCards cards={cards} />
          </ComparisonSection>
        </div>
      </EditorialPageShell>
    </>
  );
}
