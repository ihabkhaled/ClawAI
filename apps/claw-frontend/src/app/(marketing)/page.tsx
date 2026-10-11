import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { MarketingAdUnit } from '@/components/adsense/marketing-ad-unit';
import { CodingAgentBandSection } from '@/components/marketing/home/coding-agent-band-section';
import { CtaSection } from '@/components/marketing/home/cta-section';
import { EnterpriseBandSection } from '@/components/marketing/home/enterprise-band-section';
import { FeaturesSection } from '@/components/marketing/home/features-section';
import { HeroSection } from '@/components/marketing/home/hero-section';
import { HomeValueBandSection } from '@/components/marketing/home/home-value-band-section';
import { HowItWorksSection } from '@/components/marketing/home/how-it-works-section';
import { ModelRosterSection } from '@/components/marketing/home/model-roster-section';
import { PricingSection } from '@/components/marketing/home/pricing-section';
import { ThreadsBandSection } from '@/components/marketing/home/threads-band-section';
import { MarketingSceneGallery } from '@/components/marketing/shared/marketing-scene-gallery';
import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import {
  MARKETING_HOME_PAYG_BAND,
  MARKETING_HOME_TEAMS_BAND,
} from '@/constants/marketing-home.constants';
import { MarketingScenePage } from '@/enums/marketing-scene-page.enum';
import { getAdSenseSlots } from '@/lib/adsense/adsense-config';
import { DEFAULT_LOCALE } from '@/lib/i18n/i18n.constants';
import { fetchPublicModelCatalog } from '@/lib/models/public-models-api';
import { fetchPublicPricingCatalog } from '@/lib/pricing/public-pricing-api';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import { getSiteUrl } from '@/lib/site/site-config';
// Imported directly from their specific submodules rather than the
// `@/utilities` barrel — this is a server component, and the utilities
// barrel re-exports 150+ files; pulling the whole barrel into a server
// component's module graph is both a needless bundle-size hit and (per the
// same failure mode fixed in not-found.tsx and the root layout) a risk of
// dragging a client-only dependency into the server bundle and breaking
// the production build with "createContext is not a function".
import { getPageBySlug, isAdEligiblePath } from '@/utilities/content-registry.utility';
import { isSupportedLocale } from '@/utilities/locale.utility';
import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebsiteJsonLd,
  serializeJsonLd,
} from '@/utilities/structured-data.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('home');
}

// The home page is a SUMMARY and an entry point to a paid account: what you
// get (the model roster), what it costs (the plan ladder and the pay-as-you-go
// wallet), how it works, a features teaser, and three positioning bands — the
// coding agent, teams, and local-first / on-premise deployment. Every topic links out to its own dedicated page —
// long-form content lives there, not here.
export default async function HomePage(): Promise<React.ReactElement> {
  const entry = getPageBySlug('home');
  const siteUrl = getSiteUrl();
  const lastReviewed = entry?.lastReviewed ?? '';
  const plans = await fetchPublicPricingCatalog();
  const modelCatalog = await fetchPublicModelCatalog();
  const slots = getAdSenseSlots();
  const requestedLocale = (await headers()).get(LOCALE_REQUEST_HEADER);
  const locale = isSupportedLocale(requestedLocale) ? requestedLocale : DEFAULT_LOCALE;

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(buildWebsiteJsonLd(siteUrl))}</script>
      <script type="application/ld+json">
        {serializeJsonLd(buildOrganizationJsonLd(siteUrl))}
      </script>
      <script type="application/ld+json">
        {serializeJsonLd(buildSoftwareApplicationJsonLd(siteUrl))}
      </script>

      <HeroSection lastReviewed={lastReviewed} />
      <MarketingSceneGallery locale={locale} page={MarketingScenePage.HOME} />
      <ModelRosterSection providers={modelCatalog?.providers ?? []} />
      <MarketingAdUnit
        slot={slots.home}
        pathname="/"
        // Registry verdict resolved here, on the server. The unit is a client
        // component and must not read the registry itself.
        serverEligibility={isAdEligiblePath('/')}
        className="my-8 px-4 sm:px-6"
      />
      <PricingSection initialPlans={plans} />
      <HomeValueBandSection band={MARKETING_HOME_PAYG_BAND} />
      <HowItWorksSection />
      <FeaturesSection />
      <ThreadsBandSection />
      <CodingAgentBandSection />
      <HomeValueBandSection band={MARKETING_HOME_TEAMS_BAND} />
      <EnterpriseBandSection />
      <CtaSection />
    </>
  );
}
