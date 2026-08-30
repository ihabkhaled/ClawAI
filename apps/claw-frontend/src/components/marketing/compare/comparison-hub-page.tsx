import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonHubCards } from '@/components/marketing/compare/comparison-hub-cards';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  COMPARISON_HUB_PATH,
  COMPARISON_REVIEW_DATE,
  COMPARISON_SECTION_IDS,
} from '@/constants/public-comparison.constants';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { formatProductCounts } from '@/utilities/product-counts.utility';
import {
  buildComparisonHubCards,
  getComparisonContent,
} from '@/utilities/public-comparison.utility';
import { buildComparisonHubJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function ComparisonHubPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const content = getComparisonContent(locale);
  const { labels, hub } = content;
  const registryEntry = getPageBySlugAndLocale(LaunchPublicPageSlug.COMPARE, locale);

  const siteUrl = getSiteUrl();
  const canonicalPath = localisePath(COMPARISON_HUB_PATH, locale);
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const title = registryEntry?.title ?? hub.eyebrow;
  // The lede quotes the cloud-provider count, which lives as a placeholder in
  // the content files so it cannot drift from ConnectorProvider.
  const intro = formatProductCounts(hub.intro);
  const summary = registryEntry?.description ?? intro;
  const cards = buildComparisonHubCards(content, locale);

  const jsonLd = buildComparisonHubJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? COMPARISON_REVIEW_DATE,
    items: cards.map((card) => ({
      name: card.name,
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
            <time dateTime={COMPARISON_REVIEW_DATE}>{COMPARISON_REVIEW_DATE}</time>
          </p>

          <p className="editorial-comparison__lede">{intro}</p>

          <ComparisonSection id={COMPARISON_SECTION_IDS.glance} title={hub.cardsTitle}>
            <ComparisonHubCards items={cards} />
          </ComparisonSection>

          <ComparisonSection id={COMPARISON_SECTION_IDS.difference} title={hub.coversTitle}>
            <p className="editorial-comparison__body">{hub.coversBody}</p>
          </ComparisonSection>

          <p className="editorial-comparison__note">{labels.independence}</p>

          <section aria-label={labels.startFree} className="editorial-comparison__cta">
            <p className="editorial-comparison__cta-copy">{summary}</p>
            <div className="editorial-comparison__cta-actions">
              <Link href="/register" className="editorial-comparison__cta-primary">
                {labels.startFree}
              </Link>
              <Link href="/pricing" className="editorial-comparison__cta-secondary">
                {labels.seePricing}
              </Link>
            </div>
          </section>
        </div>
      </EditorialPageShell>
    </>
  );
}
