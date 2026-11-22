import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import {
  LIVE_INTELLIGENCE_FREE_MINUTES_BY_PLAN,
  LIVE_INTELLIGENCE_MARKETING_PATH,
  LIVE_INTELLIGENCE_PAID_USD_PER_MINUTE,
  LIVE_INTELLIGENCE_PORTAL_PATH,
  LIVE_INTELLIGENCE_SLUG,
  LIVE_INTELLIGENCE_SECTION_IDS,
} from '@/constants/live-intelligence-marketing.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getLiveIntelligenceMarketingContent } from '@/utilities/live-intelligence-marketing-content.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildPublicFaqJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

/**
 * The public page that introduces Live Intelligence (ADR-221): what it does, the steps, the
 * analysis modes, which sources work and which do not, plan minutes and the questions people ask.
 * Server-rendered, translated per locale.
 */
export async function LiveIntelligenceOverviewPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const content = getLiveIntelligenceMarketingContent(locale);
  const registryEntry = getPageBySlugAndLocale(LIVE_INTELLIGENCE_SLUG, locale);
  const ids = LIVE_INTELLIGENCE_SECTION_IDS;

  const canonicalUrl = new URL(
    localisePath(LIVE_INTELLIGENCE_MARKETING_PATH, locale),
    getSiteUrl(),
  ).toString();
  const openHref = localisePath(LIVE_INTELLIGENCE_PORTAL_PATH, locale);
  const pricingHref = localisePath('/pricing', locale);

  const sections = [
    { id: ids.what, label: content.whatTitle },
    { id: ids.steps, label: content.stepsTitle },
    { id: ids.features, label: content.featuresTitle },
    { id: ids.modes, label: content.modesTitle },
    { id: ids.sources, label: content.sourcesTitle },
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

          <div className="editorial-comparison__cta-actions">
            <Link className="editorial-comparison__cta-primary" href={openHref}>
              {content.openCta}
            </Link>
            <Link className="editorial-comparison__cta-secondary" href={pricingHref}>
              {content.pricingCta}
            </Link>
            <a className="editorial-comparison__cta-secondary" href={`#${ids.steps}`}>
              {content.howItWorksCta}
            </a>
          </div>

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
              {content.steps.map((step) => (
                <li key={step.title} className="editorial-comparison__list-item">
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </li>
              ))}
            </ol>
          </ComparisonSection>

          <ComparisonSection id={ids.features} title={content.featuresTitle}>
            <ul className="editorial-comparison__list">
              {content.features.map((item) => (
                <li key={item.title} className="editorial-comparison__list-item">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </ComparisonSection>

          <ComparisonSection id={ids.modes} title={content.modesTitle}>
            <p className="editorial-comparison__body">{content.modesIntro}</p>
            <ul className="editorial-comparison__list">
              {content.modes.map((item) => (
                <li key={item.title} className="editorial-comparison__list-item">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </ComparisonSection>

          <ComparisonSection id={ids.sources} title={content.sourcesTitle}>
            <p className="editorial-comparison__body">{content.sourcesIntro}</p>
            <ul className="editorial-comparison__list">
              {content.sources.map((item) => (
                <li key={item.title} className="editorial-comparison__list-item">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
          </ComparisonSection>

          <ComparisonSection id={ids.plans} title={content.plansTitle}>
            <p className="editorial-comparison__body">{content.plansIntro}</p>
            <ul className="editorial-comparison__list">
              {LIVE_INTELLIGENCE_FREE_MINUTES_BY_PLAN.map((row) => (
                <li key={row.plan} className="editorial-comparison__list-item">
                  <strong>{row.plan === 'Pro' ? content.planProAndAbove : row.plan}</strong>
                  <span>
                    {row.minutes} {content.planMinutesUnit}
                  </span>
                </li>
              ))}
            </ul>
            <p className="editorial-comparison__body">
              {content.plansBody.replace('{price}', `$${LIVE_INTELLIGENCE_PAID_USD_PER_MINUTE}`)}
            </p>
          </ComparisonSection>

          <ComparisonSection id={ids.faq} title={content.faqTitle}>
            <ComparisonFaq title={content.faqTitle} entries={content.faq} />
          </ComparisonSection>

          <section aria-label={content.closingTitle} className="editorial-comparison__cta">
            <h2 className="editorial-comparison__section-heading">{content.closingTitle}</h2>
            <p className="editorial-comparison__body">{content.closingBody}</p>
            <div className="editorial-comparison__cta-actions">
              <Link className="editorial-comparison__cta-primary" href={openHref}>
                {content.openCta}
              </Link>
            </div>
          </section>
        </div>
      </EditorialPageShell>
    </>
  );
}
