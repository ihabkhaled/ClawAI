import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  THREADS_DISCOVER_PATH,
  THREADS_MARKETING_PATH,
  THREADS_MARKETING_SECTION_IDS,
  THREADS_MARKETING_STEP_IMAGES,
  THREADS_PORTAL_PATH,
} from '@/constants/threads-marketing.constants';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildPublicFaqJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';
import { getThreadsMarketingContent } from '@/utilities/threads-marketing-content.utility';

/**
 * The public page that introduces ClawAI Threads: what it is, the six steps, the safeguards,
 * what a plan includes and the questions people ask. Server-rendered, translated per locale.
 */
export async function ThreadsOverviewPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const content = getThreadsMarketingContent(locale);
  const registryEntry = getPageBySlugAndLocale(LaunchPublicPageSlug.THREADS, locale);
  const ids = THREADS_MARKETING_SECTION_IDS;

  const canonicalUrl = new URL(
    localisePath(THREADS_MARKETING_PATH, locale),
    getSiteUrl(),
  ).toString();
  const createHref = localisePath(THREADS_PORTAL_PATH, locale);
  const discoverHref = localisePath(THREADS_DISCOVER_PATH, locale);

  const sections = [
    { id: ids.what, label: content.whatTitle },
    { id: ids.steps, label: content.stepsTitle },
    { id: ids.trust, label: content.trustTitle },
    { id: ids.outputs, label: content.outputsTitle },
    { id: ids.useCases, label: content.useCasesTitle },
    { id: ids.plans, label: content.plansTitle },
    { id: ids.faq, label: content.faqTitle },
  ];

  const jsonLd = buildPublicFaqJsonLd({
    name: registryEntry?.title ?? content.title,
    description: registryEntry?.description ?? content.intro,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    faq: content.faq,
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell
        eyebrow={content.eyebrow}
        title={content.title}
        summary={registryEntry?.description ?? content.intro}
        sectionNavigation={<EditorialSectionNav label={content.whatTitle} items={sections} />}
      >
        <div className="editorial-comparison">
          <p className="editorial-comparison__lede">{content.intro}</p>

          <section
            id={ids.announcement}
            aria-label={content.announcementTitle}
            className="editorial-comparison__cta"
          >
            <p className="editorial-page-shell__eyebrow">{content.announcementBadge}</p>
            <h2 className="editorial-comparison__section-heading">{content.announcementTitle}</h2>
            <p className="editorial-comparison__body">{content.announcementBody}</p>
            <div className="editorial-comparison__cta-actions">
              <Link className="editorial-comparison__cta-primary" href={createHref}>
                {content.createCta}
              </Link>
              <Link className="editorial-comparison__cta-secondary" href={discoverHref}>
                {content.discoverCta}
              </Link>
              <a className="editorial-comparison__cta-secondary" href={`#${ids.steps}`}>
                {content.howItWorksCta}
              </a>
            </div>
          </section>

          <ComparisonSection id={ids.what} title={content.whatTitle}>
            {content.whatParagraphs.map((paragraph) => (
              <p key={paragraph} className="editorial-comparison__body">
                {paragraph}
              </p>
            ))}
          </ComparisonSection>

          <ComparisonSection id={ids.steps} title={content.stepsTitle}>
            <p className="editorial-comparison__body">{content.stepsIntro}</p>
            <ol className="editorial-comparison__steps">
              {content.steps.map((step, index) => {
                const image = THREADS_MARKETING_STEP_IMAGES[index];
                return (
                  <li key={step.title} className="editorial-comparison__list-item">
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                    {image === undefined ? null : (
                      <figure className="editorial-figure">
                        <Image
                          src={image.src}
                          width={image.width}
                          height={image.height}
                          alt={step.title}
                          loading="lazy"
                          sizes="(min-width: 1024px) 720px, 100vw"
                        />
                      </figure>
                    )}
                  </li>
                );
              })}
            </ol>
          </ComparisonSection>

          <ComparisonSection id={ids.trust} title={content.trustTitle}>
            <p className="editorial-comparison__body">{content.trustIntro}</p>
            <ul className="editorial-comparison__list">
              {content.trust.map((item) => (
                <li key={item.title} className="editorial-comparison__list-item">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </ComparisonSection>

          <ComparisonSection id={ids.outputs} title={content.outputsTitle}>
            <ul className="editorial-comparison__list">
              {content.outputs.map((item) => (
                <li key={item.title} className="editorial-comparison__list-item">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </ComparisonSection>

          <ComparisonSection id={ids.useCases} title={content.useCasesTitle}>
            <ul className="editorial-comparison__list">
              {content.useCases.map((item) => (
                <li key={item.title} className="editorial-comparison__list-item">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </ComparisonSection>

          <ComparisonSection id={ids.plans} title={content.plansTitle}>
            <p className="editorial-comparison__body">{content.plansBody}</p>
          </ComparisonSection>

          <ComparisonSection id={ids.faq} title={content.faqTitle}>
            <ComparisonFaq title={content.faqTitle} entries={content.faq} />
          </ComparisonSection>

          <section aria-label={content.closingTitle} className="editorial-comparison__cta">
            <h2 className="editorial-comparison__section-heading">{content.closingTitle}</h2>
            <p className="editorial-comparison__body">{content.closingBody}</p>
            <div className="editorial-comparison__cta-actions">
              <Link className="editorial-comparison__cta-primary" href={createHref}>
                {content.createCta}
              </Link>
            </div>
          </section>
        </div>
      </EditorialPageShell>
    </>
  );
}
