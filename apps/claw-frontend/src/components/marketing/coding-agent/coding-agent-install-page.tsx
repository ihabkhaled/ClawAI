import { headers } from 'next/headers';
import Link from 'next/link';

import { CodingAgentInstallFigure } from '@/components/marketing/coding-agent/coding-agent-install-figure';
import { ComparisonFaq } from '@/components/marketing/compare/comparison-faq';
import { ComparisonSection } from '@/components/marketing/compare/comparison-section';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { CODING_AGENT_INSTALL_FIGURES } from '@/constants/coding-agent-figures.constants';
import { CODING_AGENT_INSTALL_SECTION_IDS } from '@/constants/coding-agent-sections.constants';
import {
  CODING_AGENT_CLI_INSTALL_COMMAND,
  CODING_AGENT_INSTALL_PATH,
  CODING_AGENT_MARKETPLACE_URL,
  CODING_AGENT_VSCODE_INSTALL_URL,
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
import { buildPublicFaqJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

export async function CodingAgentInstallPage(): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const { install } = getCodingAgentContent(locale);
  const registryEntry = getPageBySlugAndLocale(LaunchPublicPageSlug.CODING_AGENT_INSTALL, locale);

  // getPageBySlugAndLocale returns the unlocalised registry entry, which has no
  // `path` — the constant is the source of truth for the route anyway.
  const canonicalUrl = new URL(
    localisePath(CODING_AGENT_INSTALL_PATH, locale),
    getSiteUrl(),
  ).toString();

  const sections = [
    { id: CODING_AGENT_INSTALL_SECTION_IDS.steps, label: install.stepsTitle },
    { id: CODING_AGENT_INSTALL_SECTION_IDS.cli, label: install.cliTitle },
    { id: CODING_AGENT_INSTALL_SECTION_IDS.signIn, label: install.signInTitle },
    { id: CODING_AGENT_INSTALL_SECTION_IDS.troubleshooting, label: install.troubleshootingTitle },
  ];

  const jsonLd = buildPublicFaqJsonLd({
    name: registryEntry?.title ?? install.title,
    description: registryEntry?.description ?? install.intro,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    faq: install.troubleshooting,
  });

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell
        eyebrow={install.eyebrow}
        title={registryEntry?.title ?? install.title}
        summary={registryEntry?.description ?? install.intro}
        sectionNavigation={<EditorialSectionNav label={install.stepsTitle} items={sections} />}
      >
        <div className="editorial-comparison">
          <p className="editorial-comparison__lede">{install.intro}</p>

          <section aria-label={install.marketplaceCta} className="editorial-comparison__cta">
            <div className="editorial-comparison__cta-actions">
              <Link
                className="editorial-comparison__cta-primary"
                href={CODING_AGENT_MARKETPLACE_URL}
                rel="noopener noreferrer"
                target="_blank"
              >
                {install.marketplaceCta}
              </Link>
              {/* The `vscode:` protocol only resolves if VS Code is installed on
                  the machine doing the browsing, and that cannot be feature-
                  detected. So it sits beside the Marketplace link, never instead
                  of it — a dead primary button is worse than a second choice. */}
              <a
                className="editorial-comparison__cta-secondary"
                href={CODING_AGENT_VSCODE_INSTALL_URL}
              >
                {install.openInEditorCta}
              </a>
            </div>
          </section>

          <ComparisonSection id={CODING_AGENT_INSTALL_SECTION_IDS.steps} title={install.stepsTitle}>
            <ol className="editorial-comparison__steps">
              {install.steps.map((step, index) => (
                <li key={step.title} className="editorial-comparison__list-item">
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                  <CodingAgentInstallFigure
                    figure={CODING_AGENT_INSTALL_FIGURES[index]}
                    label={step.title}
                  />
                </li>
              ))}
            </ol>
          </ComparisonSection>

          <ComparisonSection id={CODING_AGENT_INSTALL_SECTION_IDS.cli} title={install.cliTitle}>
            <p className="editorial-comparison__body">{install.cliBody}</p>
            <pre className="editorial-comparison__code">
              <code>{CODING_AGENT_CLI_INSTALL_COMMAND}</code>
            </pre>
          </ComparisonSection>

          <ComparisonSection
            id={CODING_AGENT_INSTALL_SECTION_IDS.signIn}
            title={install.signInTitle}
          >
            <p className="editorial-comparison__body">{install.signInBody}</p>
          </ComparisonSection>

          <ComparisonSection
            id={CODING_AGENT_INSTALL_SECTION_IDS.troubleshooting}
            title={install.troubleshootingTitle}
          >
            <ComparisonFaq title={install.troubleshootingTitle} entries={install.troubleshooting} />
          </ComparisonSection>
        </div>
      </EditorialPageShell>
    </>
  );
}
