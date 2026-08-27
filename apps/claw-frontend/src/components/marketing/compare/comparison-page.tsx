import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonMatrix } from '@/components/marketing/compare/comparison-matrix';
import { ComparisonRail } from '@/components/marketing/compare/comparison-rail';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { ComparisonVerdict } from '@/components/marketing/compare/comparison-verdict';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  COMPARISON_HUB_PATH,
  COMPARISON_REVIEW_DATE,
  COMPARISON_SECTION_IDS,
} from '@/constants/public-comparison.constants';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import type { ComparisonPageProps } from '@/types/public-comparison.types';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import {
  buildComparisonRailItems,
  buildComparisonRows,
  formatComparisonLabel,
  getComparisonContent,
  getComparisonPath,
  getComparisonSlug,
} from '@/utilities/public-comparison.utility';
import { buildComparisonJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function ComparisonPage({ rival }: ComparisonPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const content = getComparisonContent(locale);
  const { labels } = content;
  const rivalContent = content.rivals[rival];
  const slug = getComparisonSlug(rival);
  const registryEntry = getPageBySlugAndLocale(slug, locale);
  const hubEntry = getPageBySlugAndLocale(LaunchPublicPageSlug.COMPARE, locale);

  const siteUrl = getSiteUrl();
  const canonicalPath = localisePath(getComparisonPath(rival), locale);
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const hubPath = localisePath(COMPARISON_HUB_PATH, locale);
  const title = registryEntry?.title ?? rivalContent.eyebrow;
  const summary = registryEntry?.description ?? rivalContent.intro;

  const strengthTitle = formatComparisonLabel(labels.strengthTitle, rivalContent.name);
  const sections = [
    { id: COMPARISON_SECTION_IDS.glance, label: labels.atAGlance },
    { id: COMPARISON_SECTION_IDS.strength, label: strengthTitle },
    { id: COMPARISON_SECTION_IDS.difference, label: labels.differenceTitle },
    { id: COMPARISON_SECTION_IDS.choose, label: labels.chooseTitle },
    { id: COMPARISON_SECTION_IDS.faq, label: labels.faqTitle },
  ];

  const jsonLd = buildComparisonJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? COMPARISON_REVIEW_DATE,
    hubUrl: new URL(hubPath, siteUrl).toString(),
    hubName: hubEntry?.title ?? content.hub.eyebrow,
    faq: rivalContent.faq,
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell
        eyebrow={rivalContent.eyebrow}
        title={title}
        summary={summary}
        sectionNavigation={<EditorialSectionNav label={labels.onThisPage} items={sections} />}
      >
        <div className="editorial-comparison">
          <p className="editorial-comparison__stamp">
            {labels.lastReviewed}:{' '}
            <time dateTime={COMPARISON_REVIEW_DATE}>{COMPARISON_REVIEW_DATE}</time>
          </p>

          <p className="editorial-comparison__lede">{rivalContent.intro}</p>

          <ComparisonSection id={COMPARISON_SECTION_IDS.glance} title={labels.atAGlance}>
            <ComparisonMatrix
              caption={formatComparisonLabel(labels.tableCaption, rivalContent.name)}
              capabilityColumn={labels.capabilityColumn}
              clawColumn={labels.clawColumn}
              rivalColumn={rivalContent.name}
              rows={buildComparisonRows(content, rival)}
            />
          </ComparisonSection>

          <ComparisonSection id={COMPARISON_SECTION_IDS.strength} title={strengthTitle}>
            <p className="editorial-comparison__body">{rivalContent.theirStrength}</p>
          </ComparisonSection>

          <ComparisonSection id={COMPARISON_SECTION_IDS.difference} title={labels.differenceTitle}>
            <p className="editorial-comparison__body">{rivalContent.ourDifference}</p>
          </ComparisonSection>

          <ComparisonSection id={COMPARISON_SECTION_IDS.choose} title={labels.chooseTitle}>
            <ComparisonVerdict
              title={labels.chooseTitle}
              rivalLabel={formatComparisonLabel(labels.chooseRivalLabel, rivalContent.name)}
              rivalBody={rivalContent.chooseRival}
              clawLabel={labels.chooseClawLabel}
              clawBody={rivalContent.chooseClaw}
            />
          </ComparisonSection>

          <ComparisonSection id={COMPARISON_SECTION_IDS.faq} title={labels.faqTitle}>
            <ComparisonFaq title={labels.faqTitle} entries={rivalContent.faq} />
          </ComparisonSection>

          <p className="editorial-comparison__note">{labels.independence}</p>

          <ComparisonRail
            title={labels.otherComparisons}
            items={buildComparisonRailItems(content, locale, rival)}
          />

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
