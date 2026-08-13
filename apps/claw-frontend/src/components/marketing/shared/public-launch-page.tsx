import { headers } from 'next/headers';
import Link from 'next/link';

import { MarketingAdUnit } from '@/components/adsense/marketing-ad-unit';
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
  IMPLEMENTED_PROVIDER_FAMILIES,
  LEGAL_PUBLIC_LAUNCH_SLUGS,
  PUBLIC_LAUNCH_EFFECTIVE_DATE,
} from '@/constants/public-launch-page.constants';
import { PublicLaunchPageSlug } from '@/enums/public-launch-page-slug.enum';
import { getAdSenseSlots } from '@/lib/adsense/adsense-config';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { getSiteUrl } from '@/lib/site/site-config';
import type { PublicLaunchPageProps } from '@/types/public-launch-content.types';
import { getPageBySlugAndLocale } from '@/utilities/content-registry.utility';
import { getHtmlLanguage, isSupportedLocale, localisePath } from '@/utilities/locale.utility';
import { buildPublicPageJsonLd, serializeJsonLd } from '@/utilities/structured-data.utility';

function ProviderCatalog({ heading, note }: { heading: string; note: string }): React.ReactElement {
  return (
    <section
      aria-labelledby="implemented-provider-families"
      className="border-border border-y py-10"
    >
      <h2 id="implemented-provider-families" className="sr-only">
        {heading}
      </h2>
      <ul className="bg-border grid gap-px border sm:grid-cols-2 lg:grid-cols-3">
        {IMPLEMENTED_PROVIDER_FAMILIES.map((provider) => (
          <li key={provider} className="bg-card text-foreground px-5 py-6 text-lg font-semibold">
            {provider}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-5 max-w-4xl text-sm leading-7">{note}</p>
    </section>
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
              className="border-border grid gap-4 border-t pt-8 md:grid-cols-[5rem_minmax(0,1fr)]"
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

          {slug === PublicLaunchPageSlug.SUPPORTED_MODELS ? (
            <ProviderCatalog
              heading={page.sections[0]?.title ?? page.eyebrow}
              note={labels.providerAvailabilityNote}
            />
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

          <MarketingAdUnit slot={slots.content} pathname={registryEntry?.canonicalPath ?? ''} />

          <section
            aria-label={labels.startFree}
            className="bg-foreground text-background grid gap-6 px-6 py-8 sm:grid-cols-[1fr_auto] sm:items-center sm:px-8"
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
