import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { FeatureCapabilityRail } from '@/components/marketing/features/feature-capability-rail';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import {
  FEATURES_HUB_PATH,
  FEATURES_HUB_SLUG,
  FEATURES_REVIEW_DATE,
  getFeatureCapabilityPath,
  getFeatureCapabilitySlug,
} from '@/constants/features-cluster.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import type { FeatureCapabilityPageProps } from '@/types/features-component.types';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import {
  buildFeatureCapabilitySiblings,
  buildFeatureRelatedLinks,
  getFeatureCapabilityContent,
  getFeaturesClusterContent,
} from '@/utilities/features-cluster.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnTopicJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function FeatureCapabilityPage({
  capability,
}: FeatureCapabilityPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { labels } = getFeaturesClusterContent(locale);
  const content = getFeatureCapabilityContent(locale, capability);
  const registryEntry = getPageBySlugAndLocale(getFeatureCapabilitySlug(capability), locale);
  const hubEntry = getPageBySlugAndLocale(FEATURES_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalPath = localisePath(getFeatureCapabilityPath(capability), locale);
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const hubPath = localisePath(FEATURES_HUB_PATH, locale);

  const title = registryEntry?.title ?? content.title;
  const summary = registryEntry?.description ?? content.summary;

  const sections = content.sections.map((section) => ({ id: section.id, label: section.heading }));
  const navigationItems = [...sections, { id: 'faq', label: labels.faqTitle }];

  const jsonLd = buildLearnTopicJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? FEATURES_REVIEW_DATE,
    hubUrl: new URL(hubPath, siteUrl).toString(),
    hubName: hubEntry?.title ?? '',
    faq: content.faq,
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell
        eyebrow={content.eyebrow}
        title={title}
        summary={summary}
        sectionNavigation={
          <EditorialSectionNav label={labels.onThisPage} items={navigationItems} />
        }
      >
        <div className="editorial-comparison">
          <p className="editorial-comparison__stamp">
            <Link href={hubPath} className="editorial-comparison__rail-link">
              {labels.backToHub}
            </Link>
            {' · '}
            {labels.lastReviewed}:{' '}
            <time dateTime={FEATURES_REVIEW_DATE}>{FEATURES_REVIEW_DATE}</time>
          </p>

          {content.sections.map((section) => (
            <ComparisonSection key={section.id} id={section.id} title={section.heading}>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="editorial-comparison__body">
                  {paragraph}
                </p>
              ))}
            </ComparisonSection>
          ))}

          <ComparisonSection id="faq" title={labels.faqTitle}>
            <ComparisonFaq title={labels.faqTitle} entries={content.faq} />
          </ComparisonSection>

          <div className="editorial-comparison__cta">
            <div className="editorial-comparison__cta-copy">
              <p className="editorial-comparison__verdict-label">{labels.ctaTitle}</p>
              <p className="editorial-comparison__body">{content.productNote}</p>
            </div>
            <div className="editorial-comparison__cta-actions">
              <Link
                href={localisePath('/pricing', locale)}
                className="editorial-comparison__cta-primary"
              >
                {labels.startFree}
              </Link>
              <Link
                href={localisePath('/use-cases', locale)}
                className="editorial-comparison__cta-secondary"
              >
                {labels.seeUseCases}
              </Link>
            </div>
          </div>

          <nav className="editorial-comparison__rail" aria-label={labels.relatedTitle}>
            <p className="editorial-comparison__rail-label">{labels.relatedTitle}</p>
            <ul className="editorial-comparison__rail-list">
              {buildFeatureRelatedLinks(locale, capability).map((link) => (
                <li key={link.path}>
                  <Link href={link.href} className="editorial-comparison__rail-link">
                    <span className="editorial-comparison__rail-name">
                      {getPageBySlugAndLocale(link.path.slice(1), locale)?.title ?? link.path}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <FeatureCapabilityRail
            label={labels.backToHub}
            items={buildFeatureCapabilitySiblings(locale, capability)}
          />
        </div>
      </EditorialPageShell>
    </>
  );
}
