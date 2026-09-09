import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { PromptGuideRail } from '@/components/marketing/prompts/prompt-guide-rail';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  PROMPTS_HUB_PATH,
  PROMPTS_HUB_SLUG,
  PROMPTS_REVIEW_DATE,
  getPromptGuideTopicPath,
  getPromptGuideTopicSlug,
} from '@/constants/prompts.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import type { PromptGuideTopicPageProps } from '@/types/prompt-guide-component.types';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import {
  buildPromptGuideRelatedLinks,
  buildPromptGuideSiblings,
  getPromptGuideContent,
  getPromptGuideTopicContent,
} from '@/utilities/prompt-guide.utility';
import { buildLearnTopicJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function PromptGuideTopicPage({
  topic,
}: PromptGuideTopicPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  const { labels, hub } = getPromptGuideContent(locale);
  const content = getPromptGuideTopicContent(locale, topic);
  const registryEntry = getPageBySlugAndLocale(getPromptGuideTopicSlug(topic), locale);
  const hubEntry = getPageBySlugAndLocale(PROMPTS_HUB_SLUG, locale);

  const siteUrl = getSiteUrl();
  const canonicalPath = localisePath(getPromptGuideTopicPath(topic), locale);
  const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
  const hubPath = localisePath(PROMPTS_HUB_PATH, locale);
  const pricingHref = localisePath('/pricing', locale);

  const title = registryEntry?.title ?? content.title;
  const summary = registryEntry?.description ?? content.summary;

  const sections = content.sections.map((section) => ({ id: section.id, label: section.heading }));
  const navigationItems = [...sections, { id: 'faq', label: labels.faqTitle }];

  const jsonLd = buildLearnTopicJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? PROMPTS_REVIEW_DATE,
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
            {labels.lastReviewed}: <time dateTime={PROMPTS_REVIEW_DATE}>{PROMPTS_REVIEW_DATE}</time>
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
              {buildPromptGuideRelatedLinks(locale, topic).map((link) => (
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

          <PromptGuideRail
            label={labels.backToHub}
            items={buildPromptGuideSiblings(locale, topic)}
          />
        </div>
      </EditorialPageShell>
    </>
  );
}
