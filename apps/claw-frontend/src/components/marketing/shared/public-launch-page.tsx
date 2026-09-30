import { headers } from 'next/headers';
import Link from 'next/link';

import { MarketingAdUnit } from '@/components/adsense/marketing-ad-unit';
import { ModelRosterSection } from '@/components/marketing/home/model-roster-section';
import { EditorialPageShell } from '@/components/marketing/shared/editorial-page-shell';
import { EditorialSectionNav } from '@/components/marketing/shared/editorial-section-nav';
import { EvidenceNote } from '@/components/marketing/shared/evidence-note';
import { RoutingRail } from '@/components/marketing/shared/routing-rail';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  PUBLIC_LAUNCH_CONTENT_BY_LOCALE,
  PUBLIC_LAUNCH_LABELS_BY_LOCALE,
} from '@/constants/public-launch-content.constants';
import {
  LEGAL_PUBLIC_LAUNCH_SLUGS,
  PUBLIC_LAUNCH_EFFECTIVE_DATE,
} from '@/constants/public-launch-page.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import { getAdSenseSlots } from '@/lib/adsense/adsense-config';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { fetchPublicModelCatalog } from '@/lib/models/public-models-api';
import { getSiteUrl } from '@/lib/site/site-config';
import type { PublicLaunchPageProps } from '@/types/public-launch-content.types';
import type { PublicCatalogProvider } from '@/types/public-models.types';
import { isAdEligiblePath, getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { selectAvailableProviders } from '@/utilities/public-models.utility';
import { buildPublicPageJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

/**
 * The models this deployment can actually serve, read from the live connector
 * catalog and rendered with the SAME section the home page uses, so the two can
 * never disagree about what a visitor gets.
 *
 * It listed seven hardcoded names — including DeepSeek, xAI Grok and llama.cpp,
 * which have no connected models here — and then a bare list of provider names.
 * The roster shows each provider's real model count and a sample of real names,
 * and the page shrinks or grows honestly as connectors are configured.
 */
function AvailableModels({
  note,
  providers,
}: {
  note: string;
  providers: readonly PublicCatalogProvider[];
}): React.ReactElement {
  return (
    <div className="border-border border-y">
      <ModelRosterSection providers={providers} />
      <p className="text-muted-foreground mx-auto max-w-4xl px-4 pb-10 text-sm leading-7 sm:px-6 lg:px-8">
        {note}
      </p>
    </div>
  );
}

export async function PublicLaunchPage({
  slug,
}: PublicLaunchPageProps): Promise<React.ReactElement> {
  const requestHeaders = await headers();
  const requestedLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;
  const page = PUBLIC_LAUNCH_CONTENT_BY_LOCALE[locale][slug];
  const labels = PUBLIC_LAUNCH_LABELS_BY_LOCALE[locale];
  const registryEntry = getPageBySlugAndLocale(slug, locale);
  // Only this one page names providers, so only this one page pays for the
  // fetch. An unavailable catalog yields an empty list, and the section below
  // renders nothing rather than a roster nobody verified.
  const providers =
    slug === PublicLaunchPageSlug.SUPPORTED_MODELS
      ? selectAvailableProviders(await fetchPublicModelCatalog())
      : [];
  const title =
    registryEntry === undefined || registryEntry.title === '' ? page.eyebrow : registryEntry.title;
  const summary =
    registryEntry === undefined || registryEntry.description === ''
      ? (page.sections[0]?.body ?? '')
      : registryEntry.description;
  const navigation = page.sections.map((section) => ({
    id: section.id,
    label: section.title,
  }));
  const showRoutingRail =
    slug === PublicLaunchPageSlug.ABOUT || slug === PublicLaunchPageSlug.SECURITY_AND_PRIVACY;
  const canonicalPath = localisePath(registryEntry?.canonicalPath ?? `/${slug}`, locale);
  const canonicalUrl = new URL(canonicalPath, getSiteUrl()).toString();
  const jsonLd = buildPublicPageJsonLd({
    name: title,
    description: summary,
    canonicalUrl,
    language: getHtmlLanguage(locale),
    lastReviewed: registryEntry?.lastReviewed ?? PUBLIC_LAUNCH_EFFECTIVE_DATE,
  });
  const slots = getAdSenseSlots();

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <EditorialPageShell
        eyebrow={page.eyebrow}
        title={title}
        summary={summary}
        sectionNavigation={<EditorialSectionNav label={labels.onThisPage} items={navigation} />}
      >
        <div className="space-y-14">
          <p className="text-muted-foreground font-mono text-xs font-semibold tracking-wider uppercase">
            {LEGAL_PUBLIC_LAUNCH_SLUGS.has(slug) ? labels.effectiveDate : labels.lastReviewed}:{' '}
            <time dateTime={PUBLIC_LAUNCH_EFFECTIVE_DATE}>{PUBLIC_LAUNCH_EFFECTIVE_DATE}</time>
          </p>

          {page.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="border-border grid grid-cols-1 gap-4 border-t pt-8 md:grid-cols-[5rem_minmax(0,1fr)]"
            >
              <p className="text-primary font-mono text-sm font-semibold" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </p>
              <div>
                <h2
                  id={`${section.id}-heading`}
                  className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  {section.title}
                </h2>
                <p className="text-muted-foreground mt-4 max-w-3xl text-base leading-8">
                  {section.body}
                </p>
              </div>
            </section>
          ))}

          {slug === PublicLaunchPageSlug.SUPPORTED_MODELS && providers.length > 0 ? (
            <AvailableModels note={labels.providerAvailabilityNote} providers={providers} />
          ) : null}
          {showRoutingRail ? (
            <RoutingRail
              title={labels.routingRailTitle}
              summary={labels.routingRailSummary}
              textAlternative={labels.routingRailAlternative}
              evaluation={{
                label: labels.evaluate,
                description: labels.evaluateDescription,
              }}
              routing={{ label: labels.route, description: labels.routeDescription }}
              comparison={{
                label: labels.compare,
                description: labels.compareDescription,
              }}
              receipt={{ label: labels.receipt, description: labels.receiptDescription }}
            />
          ) : null}

          <EvidenceNote
            label={labels.evidence}
            source={{ href: '/architecture', label: labels.evidence }}
          >
            <p>{page.evidence}</p>
          </EvidenceNote>

          <MarketingAdUnit
            slot={slots.content}
            pathname={registryEntry?.canonicalPath ?? ''}
            serverEligibility={isAdEligiblePath(registryEntry?.canonicalPath ?? '')}
          />

          <section
            aria-label={labels.startFree}
            className="bg-foreground text-background grid grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8"
          >
            <p className="max-w-2xl text-lg font-semibold">{summary}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
              >
                {labels.startFree}
              </Link>
              <Link
                href="/contact?intent=enterprise"
                className="border-background/40 focus-visible:ring-ring inline-flex min-h-11 items-center border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
              >
                {labels.contactTeam}
              </Link>
            </div>
          </section>
        </div>
      </EditorialPageShell>
    </>
  );
}
