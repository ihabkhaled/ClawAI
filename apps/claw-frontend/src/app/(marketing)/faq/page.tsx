import type { Metadata } from 'next';

import { FaqCategoriesSection } from '@/components/marketing/faq/faq-categories-section';
import { FaqContactSection } from '@/components/marketing/faq/faq-contact-section';
import { FaqHeroSection } from '@/components/marketing/faq/faq-hero-section';
import { FaqTopicsSection } from '@/components/marketing/faq/faq-topics-section';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';
// Imported directly from their specific submodules rather than the
// `@/utilities` barrel — this is a server component, and the utilities
// barrel re-exports 150+ files; pulling the whole barrel into a server
// component's module graph is both a needless bundle-size hit and a risk of
// dragging a client-only dependency into the server bundle and breaking the
// production build with "createContext is not a function".
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('faq');
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
