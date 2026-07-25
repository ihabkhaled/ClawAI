import type { Metadata } from 'next';

import { FaqCategoriesSection } from '@/components/marketing/faq/faq-categories-section';
import { FaqContactSection } from '@/components/marketing/faq/faq-contact-section';
import { FaqHeroSection } from '@/components/marketing/faq/faq-hero-section';
import { FaqTopicsSection } from '@/components/marketing/faq/faq-topics-section';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
// Imported directly from their specific submodules rather than the
// `@/utilities` barrel — this is a server component, and the utilities
// barrel re-exports 150+ files; pulling the whole barrel into a server
// component's module graph is both a needless bundle-size hit and a risk of
// dragging a client-only dependency into the server bundle and breaking the
// production build with "createContext is not a function".
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('faq');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonical = `${siteUrl}${entry?.canonicalPath ?? '/faq'}`;
  // The registry entry for this slug is still a placeholder (empty title and
  // description), so fall back on an empty string as well as on undefined —
  // `??` alone would happily ship an empty <title>.
  const registryTitle = entry?.title ?? '';
  const registryDescription = entry?.description ?? '';
  const title =
    registryTitle === '' ? 'ClawAI FAQ — plans, models, billing and privacy' : registryTitle;
  const description =
    registryDescription === ''
      ? 'Answers to the most common questions about ClawAI: what a subscription includes, the seven plans and how billing works, which frontier models you can use, how AUTO routing and usage allowances work, what happens to your data, and private deployments for organisations.'
      : registryDescription;
  const ogImageUrl = `${siteUrl}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: !noIndexEverything,
      follow: !noIndexEverything,
    },
    openGraph: {
      type: 'website',
      siteName: 'ClawAI',
      title,
      description,
      url: canonical,
      locale: 'en_US',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: 'ClawAI — frontier AI models in one subscription',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default function FaqPage(): React.ReactElement {
  const entry = getPageBySlug('faq');
  const lastReviewed = entry?.lastReviewed ?? '';

  return (
    <>
      <FaqHeroSection lastReviewed={lastReviewed} />
      <FaqTopicsSection />
      <FaqCategoriesSection />
      <FaqContactSection />
    </>
  );
}
