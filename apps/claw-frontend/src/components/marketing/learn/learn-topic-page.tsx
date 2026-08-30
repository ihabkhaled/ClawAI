import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { LearnRail } from '@/components/marketing/learn/learn-rail';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import {
  LEARN_HUB_PATH,
  LEARN_HUB_SLUG,
  LEARN_REVIEW_DATE,
  getLearnTopicPath,
  getLearnTopicSlug,
} from '@/constants/learn.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import type { LearnTopicPageProps } from '@/types/learn-component.types';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import {
  buildLearnRelatedLinks,
  buildLearnSiblings,
  getLearnContent,
  getLearnTopic,
} from '@/utilities/learn.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildLearnTopicJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function LearnTopicPage({ topic }: LearnTopicPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { labels, hub } = getLearnContent(locale);
  const content = getLearnTopic(locale, topic);
  const registryEntry = getPageBySlugAndLocale(getLearnTopicSlug(topic), locale);
  const hubEntry = getPageBySlugAndLocale(LEARN_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalPath = localisePath(getLearnTopicPath(topic), locale);
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const hubPath = localisePath(LEARN_HUB_PATH, locale);

  // The registry title is what the sitemap, the feeds and the <title> all carry,
  // so the visible h1 uses it too rather than a second string that can drift.
  const title = registryEntry?.title ?? content.title;
  const summary = registryEntry?.description ?? content.summary;

  const sections = content.sections.map((section) => ({
    id: section.id,
    label: section.heading,
  }));
  const navigationItems = [...sections, { id: 'faq', label: labels.faqTitle }];

  const jsonLd = buildLearnTopicJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? LEARN_REVIEW_DATE,
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
            {labels.lastReviewed}: <time dateTime={LEARN_REVIEW_DATE}>{LEARN_REVIEW_DATE}</time>
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
              {buildLearnRelatedLinks(locale, topic).map((link) => (
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

          <LearnRail label={labels.backToHub} items={buildLearnSiblings(locale, topic)} />
        </div>
      </EditorialPageShell>
    </>
  );
}
