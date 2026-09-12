import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { ModelCatalog } from '@/components/marketing/models/model-catalog';
import { ModelRail } from '@/components/marketing/models/model-rail';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { MODEL_PAGE_VISIBLE_MODEL_LIMIT } from '@/constants/model-provider-mapping.constants';
import {
  MODELS_HUB_PATH,
  MODELS_HUB_SLUG,
  MODELS_REVIEW_DATE,
  getModelProviderPath,
  getModelProviderSlug,
} from '@/constants/models.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { fetchPublicModelCatalog } from '@/lib/models/public-models-api';
import { getSiteUrl } from '@/lib/site/site-config';
import type { ModelProviderPageProps } from '@/types/models-component.types';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import {
  buildModelRelatedLinks,
  buildModelSiblings,
  getModelProviderContent,
  getModelsContent,
} from '@/utilities/models.utility';
import { selectModelsForProviderPage } from '@/utilities/public-models.utility';
import { buildLearnTopicJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function ModelProviderPage({
  provider,
}: ModelProviderPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { labels, hub } = getModelsContent(locale);
  const content = getModelProviderContent(locale, provider);
  // The live catalog, not a hand-maintained constant. Null means the fetch
  // failed; an empty array means this deployment genuinely has no models for
  // this provider. The page must say different things about those.
  const catalog = await fetchPublicModelCatalog();
  const models = selectModelsForProviderPage(catalog, provider);
  const registryEntry = getPageBySlugAndLocale(getModelProviderSlug(provider), locale);
  const hubEntry = getPageBySlugAndLocale(MODELS_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalPath = localisePath(getModelProviderPath(provider), locale);
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const hubPath = localisePath(MODELS_HUB_PATH, locale);
  const pricingHref = localisePath('/pricing', locale);

  const title = registryEntry?.title ?? content.title;
  const summary = registryEntry?.description ?? content.summary;

  const sections = content.sections.map((section) => ({ id: section.id, label: section.heading }));
  const navigationItems = [
    { id: 'models', label: labels.catalogHeading },
    ...sections,
    { id: 'faq', label: labels.faqTitle },
  ];

  const jsonLd = buildLearnTopicJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? MODELS_REVIEW_DATE,
    hubUrl: new URL(hubPath, siteUrl).toString(),
    hubName: hubEntry?.title ?? hub.title,
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
            {labels.lastReviewed}: <time dateTime={MODELS_REVIEW_DATE}>{MODELS_REVIEW_DATE}</time>
          </p>

          <ModelCatalog
            heading={labels.catalogHeading}
            models={models}
            totalCount={models.length}
            visibleLimit={MODEL_PAGE_VISIBLE_MODEL_LIMIT}
            isUnavailable={catalog === null}
            unavailableNote={labels.catalogUnavailable}
            moreLabel={labels.catalogMore}
            contextLabel={labels.contextWindowLabel}
            capabilityLabels={labels.capabilityLabels}
            disclaimer={labels.catalogLiveNote}
            pricingHref={pricingHref}
            seePricing={labels.seePricing}
          />

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
              <Link href={pricingHref} className="editorial-comparison__cta-primary">
                {labels.startFree}
              </Link>
              <Link
                href={localisePath('/features', locale)}
                className="editorial-comparison__cta-secondary"
              >
                {labels.seeFeatures}
              </Link>
            </div>
          </div>

          <nav className="editorial-comparison__rail" aria-label={labels.relatedTitle}>
            <p className="editorial-comparison__rail-label">{labels.relatedTitle}</p>
            <ul className="editorial-comparison__rail-list">
              {buildModelRelatedLinks(locale, provider).map((link) => (
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

          <ModelRail label={labels.backToHub} items={buildModelSiblings(locale, provider)} />
        </div>
      </EditorialPageShell>
    </>
  );
}
