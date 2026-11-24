import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { LiveIntelligenceItemList } from '@/components/marketing/live-intelligence/live-intelligence-item-list';
import { LiveIntelligencePlatformGroup } from '@/components/marketing/live-intelligence/live-intelligence-platform-group';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import {
  LIVE_INTELLIGENCE_MARKETING_PATH,
  LIVE_INTELLIGENCE_PLATFORMS_PATH,
  LIVE_INTELLIGENCE_PLATFORMS_SECTION_IDS,
  LIVE_INTELLIGENCE_PLATFORMS_SLUG,
  LIVE_INTELLIGENCE_PORTAL_PATH,
  LIVE_INTELLIGENCE_SIGN_UP_PATH,
} from '@/constants/live-intelligence-marketing.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import {
  getLiveIntelligenceMarketingContent,
  groupLiveMarketingPlatforms,
} from '@/utilities/live-intelligence-marketing-content.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildPublicFaqJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

/**
 * The public list of every platform Live & Video Intelligence can read, grouped by kind, with what
 * works on each and the honest limits. The platform list itself is `LIVE_MARKETING_PLATFORMS`.
 */
export async function LiveIntelligencePlatformsPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const content = getLiveIntelligenceMarketingContent(locale);
  const page = content.platformsPage;
  const registryEntry = getPageBySlugAndLocale(LIVE_INTELLIGENCE_PLATFORMS_SLUG, locale);
  const ids = LIVE_INTELLIGENCE_PLATFORMS_SECTION_IDS;
  const groups = groupLiveMarketingPlatforms(page);

  const canonicalUrl = new URL(
    localisePath(LIVE_INTELLIGENCE_PLATFORMS_PATH, locale),
    getSiteUrl(),
  ).toString();
  const openHref = localisePath(LIVE_INTELLIGENCE_PORTAL_PATH, locale);
  const signUpHref = localisePath(LIVE_INTELLIGENCE_SIGN_UP_PATH, locale);
  const overviewHref = localisePath(LIVE_INTELLIGENCE_MARKETING_PATH, locale);

  const sections = [
    { id: ids.groups, label: page.groupsTitle },
    { id: ids.support, label: page.supportTitle },
    { id: ids.limits, label: page.limitsTitle },
    { id: ids.faq, label: page.faqTitle },
  ];

  const jsonLd = buildPublicFaqJsonLd({
    name: registryEntry?.title ?? page.title,
    description: registryEntry?.description ?? page.intro,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    faq: page.faq,
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell
        eyebrow={page.eyebrow}
        title={page.title}
        summary={page.intro}
        sectionNavigation={<EditorialSectionNav label={page.eyebrow} items={sections} />}
      >
        <div className="editorial-comparison">
          <div className="editorial-comparison__cta-actions">
            <Link className="editorial-comparison__cta-primary" href={openHref}>
              {page.openCta}
            </Link>
            <Link className="editorial-comparison__cta-secondary" href={overviewHref}>
              {page.backCta}
            </Link>
          </div>

          <ComparisonSection id={ids.groups} title={page.groupsTitle}>
            <p className="editorial-comparison__note">{page.groupsIntro}</p>
            <div className="flex flex-col gap-8">
              {groups.map((view) => (
                <LiveIntelligencePlatformGroup
                  key={view.group}
                  view={view}
                  liveTag={page.liveTag}
                  videoTag={page.videoTag}
                />
              ))}
            </div>
          </ComparisonSection>

          <ComparisonSection id={ids.support} title={page.supportTitle}>
            <p className="editorial-comparison__body">{page.supportIntro}</p>
            <LiveIntelligenceItemList items={page.support} />
          </ComparisonSection>

          <ComparisonSection id={ids.limits} title={page.limitsTitle}>
            <LiveIntelligenceItemList items={page.limits} />
          </ComparisonSection>

          <ComparisonSection id={ids.faq} title={page.faqTitle}>
            <ComparisonFaq title={page.faqTitle} entries={page.faq} />
          </ComparisonSection>

          <section aria-label={page.closingTitle} className="editorial-comparison__cta">
            <h2 className="editorial-comparison__section-heading">{page.closingTitle}</h2>
            <p className="editorial-comparison__body">{page.closingBody}</p>
            <div className="editorial-comparison__cta-actions">
              <Link className="editorial-comparison__cta-primary" href={openHref}>
                {page.openCta}
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
