import { headers } from 'next/headers';

import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { LearnTopicCards } from '@/components/marketing/learn/learn-topic-cards';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { LEARN_HUB_PATH, LEARN_HUB_SLUG, LEARN_REVIEW_DATE } from '@/constants/learn.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { buildLearnHubCards, getLearnContent } from '@/utilities/learn.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnHubJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function LearnHubPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { hub, labels } = getLearnContent(locale);
  const cards = buildLearnHubCards(locale);
  const registryEntry = getPageBySlugAndLocale(LEARN_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalUrl = new URL(localisePath(LEARN_HUB_PATH, locale), siteUrl).toString();
  const title = registryEntry?.title ?? hub.title;
  const summary = registryEntry?.description ?? hub.summary;

  const jsonLd = buildLearnHubJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? LEARN_REVIEW_DATE,
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
            {labels.lastReviewed}: <time dateTime={LEARN_REVIEW_DATE}>{LEARN_REVIEW_DATE}</time>
          </p>

          <ComparisonSection id="topics" title={hub.topicsHeading}>
            <LearnTopicCards cards={cards} />
          </ComparisonSection>
        </div>
      </EditorialPageShell>
    </>
  );
}
