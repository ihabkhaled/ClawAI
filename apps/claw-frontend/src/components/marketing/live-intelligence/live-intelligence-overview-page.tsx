import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { LiveIntelligenceItemList } from '@/components/marketing/live-intelligence/live-intelligence-item-list';
import { LiveIntelligencePlatformNames } from '@/components/marketing/live-intelligence/live-intelligence-platform-names';
import { LiveIntelligenceScreenshotStrip } from '@/components/marketing/live-intelligence/live-intelligence-screenshot-strip';
import { LiveIntelligenceVideoPair } from '@/components/marketing/live-intelligence/live-intelligence-video-pair';
import { LiveIntelligenceWaysTable } from '@/components/marketing/live-intelligence/live-intelligence-ways-table';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import {
  LIVE_INTELLIGENCE_MARKETING_PATH,
  LIVE_INTELLIGENCE_PLATFORMS_PATH,
  LIVE_INTELLIGENCE_PORTAL_PATH,
  LIVE_INTELLIGENCE_SECTION_IDS,
  LIVE_INTELLIGENCE_SIGN_UP_PATH,
  LIVE_INTELLIGENCE_SLUG,
} from '@/constants/live-intelligence-marketing.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import {
  buildLiveIntelligenceScreenshotViews,
  buildLiveIntelligenceVideoJsonLdInputs,
  buildLiveIntelligenceVideoViews,
  getLiveIntelligenceMarketingContent,
  listLiveMarketingPlatformNames,
} from '@/utilities/live-intelligence-marketing-content.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import {
  buildPublicFaqJsonLd,
  buildVideoObjectsJsonLd,
  serializeJsonLd,
} from '@/utilities/structured-data.utility';

/**
 * The public page for Live & Video Intelligence (ADR-221, renamed 2026-11-24): the hero, the two
 * clips, the four steps, phone screenshots, outcomes, the two ways compared, the analysis modes,
 * languages, the platforms teaser, honest limits and the questions people ask. Server-rendered,
 * translated per locale.
 */
export async function LiveIntelligenceOverviewPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const content = getLiveIntelligenceMarketingContent(locale);
  const registryEntry = getPageBySlugAndLocale(LIVE_INTELLIGENCE_SLUG, locale);
  const ids = LIVE_INTELLIGENCE_SECTION_IDS;
  const siteUrl = getSiteUrl();
  const videos = buildLiveIntelligenceVideoViews(content);
  const screenshots = buildLiveIntelligenceScreenshotViews(content);

  const canonicalUrl = new URL(
    localisePath(LIVE_INTELLIGENCE_MARKETING_PATH, locale),
    siteUrl,
  ).toString();
  const openHref = localisePath(LIVE_INTELLIGENCE_PORTAL_PATH, locale);
  const signUpHref = localisePath(LIVE_INTELLIGENCE_SIGN_UP_PATH, locale);
  const platformsHref = localisePath(LIVE_INTELLIGENCE_PLATFORMS_PATH, locale);

  const sections = [
    { id: ids.videos, label: content.videosTitle },
    { id: ids.steps, label: content.stepsTitle },
    { id: ids.outcomes, label: content.outcomesTitle },
    { id: ids.ways, label: content.waysTitle },
    { id: ids.modes, label: content.modesTitle },
    { id: ids.languages, label: content.languagesTitle },
    { id: ids.platforms, label: content.platformsTitle },
    { id: ids.limits, label: content.limitsTitle },
    { id: ids.faq, label: content.faqTitle },
  ];

  const faqJsonLd = buildPublicFaqJsonLd({
    name: registryEntry?.title ?? content.title,
    description: registryEntry?.description ?? content.intro,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    faq: content.faq,
  });
  const videoJsonLd = buildVideoObjectsJsonLd(
    buildLiveIntelligenceVideoJsonLdInputs(videos, siteUrl),
  );

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(faqJsonLd)}</script>
      <script type="application/ld+json">{serializeJsonLd(videoJsonLd)}</script>
      <EditorialPageShell
        eyebrow={content.eyebrow}
        title={content.title}
        summary={content.intro}
        sectionNavigation={<EditorialSectionNav label={content.eyebrow} items={sections} />}
      >
        <div className="editorial-comparison">
          <div className="editorial-comparison__cta-actions">
            <Link className="editorial-comparison__cta-primary" href={openHref}>
              {content.openCta}
            </Link>
            <Link className="editorial-comparison__cta-secondary" href={signUpHref}>
              {content.signUpCta}
            </Link>
            <a className="editorial-comparison__cta-secondary" href={`#${ids.steps}`}>
              {content.howItWorksCta}
            </a>
          </div>

          <ComparisonSection id={ids.videos} title={content.videosTitle}>
            <p className="editorial-comparison__body">{content.videosIntro}</p>
            <LiveIntelligenceVideoPair videos={videos} />
          </ComparisonSection>

          <ComparisonSection id={ids.steps} title={content.stepsTitle}>
            <p className="editorial-comparison__body">{content.stepsIntro}</p>
            <LiveIntelligenceItemList items={content.steps} ordered />
          </ComparisonSection>

          <ComparisonSection id={ids.screenshots} title={content.screenshotsTitle}>
            <p className="editorial-comparison__body">{content.screenshotsIntro}</p>
            <LiveIntelligenceScreenshotStrip screenshots={screenshots} />
          </ComparisonSection>

          <ComparisonSection id={ids.outcomes} title={content.outcomesTitle}>
            <LiveIntelligenceItemList items={content.outcomes} />
          </ComparisonSection>

          <ComparisonSection id={ids.ways} title={content.waysTitle}>
            <p className="editorial-comparison__body">{content.waysIntro}</p>
            <LiveIntelligenceItemList items={content.ways} />
            <LiveIntelligenceWaysTable
              caption={content.waysTableCaption}
              aspect={content.waysTableAspect}
              live={content.waysTableLive}
              summary={content.waysTableSummary}
              rows={content.waysRows}
            />
          </ComparisonSection>

          <ComparisonSection id={ids.modes} title={content.modesTitle}>
            <p className="editorial-comparison__body">{content.modesIntro}</p>
            <LiveIntelligenceItemList items={content.modes} />
            <p className="editorial-comparison__note">{content.researchNote}</p>
          </ComparisonSection>

          <ComparisonSection id={ids.languages} title={content.languagesTitle}>
            {content.languagesParagraphs.map((paragraph) => (
              <p key={paragraph} className="editorial-comparison__body">
                {paragraph}
              </p>
            ))}
          </ComparisonSection>

          <ComparisonSection id={ids.platforms} title={content.platformsTitle}>
            <p className="editorial-comparison__body">{content.platformsBody}</p>
            <LiveIntelligencePlatformNames names={listLiveMarketingPlatformNames()} />
            <div className="editorial-comparison__cta-actions">
              <Link className="editorial-comparison__cta-secondary" href={platformsHref}>
                {content.platformsCta}
              </Link>
            </div>
          </ComparisonSection>

          <ComparisonSection id={ids.limits} title={content.limitsTitle}>
            <LiveIntelligenceItemList items={content.limits} />
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
              <Link className="editorial-comparison__cta-secondary" href={signUpHref}>
                {content.signUpCta}
              </Link>
            </div>
          </section>
        </div>
      </EditorialPageShell>
    </>
  );
}
