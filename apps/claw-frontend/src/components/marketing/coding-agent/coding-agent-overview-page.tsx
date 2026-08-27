import { headers } from 'next/headers';
import Link from 'next/link';

import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { CODING_AGENT_SECTION_IDS } from '@/constants/coding-agent-sections.constants';
import {
  CODING_AGENT_INSTALL_PATH,
  CODING_AGENT_MARKETPLACE_URL,
  CODING_AGENT_PATH,
} from '@/constants/coding-agent.constants';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { LaunchPublicPageSlug } from '@/enums/launch-public-page-slug.enum';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported from their specific submodules rather than the `@/utilities` barrel —
// this is a server component, and the barrel re-exports 150+ files.
import { getCodingAgentContent } from '@/utilities/coding-agent-content.utility';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildCodingAgentJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function CodingAgentOverviewPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const { overview } = getCodingAgentContent(locale);
  const registryEntry = getPageBySlugAndLocale(LaunchPublicPageSlug.CODING_AGENT, locale);

  const siteUrl = getSiteUrl();
  // getPageBySlugAndLocale returns the unlocalised registry entry, which has no
  // `path` — the constant is the source of truth for the route anyway.
  const canonicalUrl = new URL(localisePath(CODING_AGENT_PATH, locale), siteUrl).toString();
  const installPath = localisePath(CODING_AGENT_INSTALL_PATH, locale);

  const sections = [
    { id: CODING_AGENT_SECTION_IDS.capabilities, label: overview.capabilitiesTitle },
    { id: CODING_AGENT_SECTION_IDS.requirements, label: overview.requirementsTitle },
    { id: CODING_AGENT_SECTION_IDS.faq, label: overview.faqTitle },
  ];

  const jsonLd = buildCodingAgentJsonLd({
    name: registryEntry?.title ?? overview.title,
    description: registryEntry?.description ?? overview.intro,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    downloadUrl: CODING_AGENT_MARKETPLACE_URL,
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell
        eyebrow={overview.eyebrow}
        title={registryEntry?.title ?? overview.title}
        summary={registryEntry?.description ?? overview.intro}
        sectionNavigation={
          <EditorialSectionNav label={overview.capabilitiesTitle} items={sections} />
        }
      >
        <div className="editorial-comparison">
          <p className="editorial-comparison__lede">{overview.intro}</p>

          <section aria-label={overview.installCta} className="editorial-comparison__cta">
            <div className="editorial-comparison__cta-actions">
              <Link className="editorial-comparison__cta-primary" href={installPath}>
                {overview.installCta}
              </Link>
              {/* rel="noopener" on a cross-origin target: without it the opened
                  page can reach back through window.opener. */}
              <Link
                className="editorial-comparison__cta-secondary"
                href={CODING_AGENT_MARKETPLACE_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                {overview.marketplaceCta}
              </Link>
            </div>
          </section>

          <ComparisonSection
            id={CODING_AGENT_SECTION_IDS.capabilities}
            title={overview.capabilitiesTitle}
          >
            <ul className="editorial-comparison__list">
              {overview.capabilities.map((capability) => (
                <li key={capability.title} className="editorial-comparison__list-item">
                  <strong>{capability.title}</strong>
                  <span>{capability.body}</span>
                </li>
              ))}
            </ul>
          </ComparisonSection>

          <ComparisonSection
            id={CODING_AGENT_SECTION_IDS.requirements}
            title={overview.requirementsTitle}
          >
            <p className="editorial-comparison__body">{overview.requirementsBody}</p>
          </ComparisonSection>

          <ComparisonSection id={CODING_AGENT_SECTION_IDS.faq} title={overview.faqTitle}>
            <ComparisonFaq title={overview.faqTitle} entries={overview.faq} />
          </ComparisonSection>
        </div>
      </EditorialPageShell>
    </>
  );
}
