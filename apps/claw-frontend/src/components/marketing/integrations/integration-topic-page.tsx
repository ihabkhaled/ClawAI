import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { IntegrationCapabilities } from '@/components/marketing/integrations/integration-capabilities';
import { IntegrationRail } from '@/components/marketing/integrations/integration-rail';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { INTEGRATION_FACTS } from '@/constants/integration-facts.constants';
import {
  INTEGRATIONS_HUB_PATH,
  INTEGRATIONS_HUB_SLUG,
  INTEGRATIONS_REVIEW_DATE,
  getIntegrationPath,
  getIntegrationSlug,
} from '@/constants/integrations.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import type { IntegrationTopicPageProps } from '@/types/integrations-component.types';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import {
  buildIntegrationRelatedLinks,
  buildIntegrationSiblings,
  getIntegrationTopic,
  getIntegrationsContent,
} from '@/utilities/integrations.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnTopicJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function IntegrationTopicPage({
  topic,
}: IntegrationTopicPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { labels, hub } = getIntegrationsContent(locale);
  const content = getIntegrationTopic(locale, topic);
  const facts = INTEGRATION_FACTS[topic];
  const registryEntry = getPageBySlugAndLocale(getIntegrationSlug(topic), locale);
  const hubEntry = getPageBySlugAndLocale(INTEGRATIONS_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalPath = localisePath(getIntegrationPath(topic), locale);
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const hubPath = localisePath(INTEGRATIONS_HUB_PATH, locale);

  const title = registryEntry?.title ?? content.title;
  const summary = registryEntry?.description ?? content.summary;

  const sections = content.sections.map((section) => ({ id: section.id, label: section.heading }));
  const navigationItems = [
    { id: 'capabilities', label: labels.capabilitiesHeading },
    ...sections,
    { id: 'faq', label: labels.faqTitle },
  ];

  const jsonLd = buildLearnTopicJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? INTEGRATIONS_REVIEW_DATE,
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
            {labels.lastReviewed}:{' '}
            <time dateTime={INTEGRATIONS_REVIEW_DATE}>{INTEGRATIONS_REVIEW_DATE}</time>
          </p>

          <div id="capabilities">
            <IntegrationCapabilities
              heading={labels.capabilitiesHeading}
              readLabel={labels.readLabel}
              writeLabel={labels.writeLabel}
              syncLabel={labels.syncLabel}
              realTimeLabel={labels.realTimeLabel}
              pollBasedLabel={labels.pollBasedLabel}
              readableObjects={facts.readableObjects}
              writeActions={facts.writeActions}
              isRealTime={facts.capabilities.webhooks}
            />
          </div>

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
              {buildIntegrationRelatedLinks(locale, topic).map((link) => (
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

          <IntegrationRail
            label={labels.backToHub}
            items={buildIntegrationSiblings(locale, topic)}
          />
        </div>
      </EditorialPageShell>
    </>
  );
}
