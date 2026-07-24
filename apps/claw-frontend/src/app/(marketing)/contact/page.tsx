import type { Metadata } from 'next';

import { ContactSection } from '@/components/marketing/contact/contact-section';
import { getSiteUrl, shouldNoIndexEverything } from '@/lib/site/site-config';
import { getPageBySlug } from '@/utilities/content-registry.utility';

export async function generateMetadata(): Promise<Metadata> {
  const entry = getPageBySlug('contact');
  const siteUrl = getSiteUrl();
  const noIndexEverything = shouldNoIndexEverything();
  const canonical = `${siteUrl}${entry?.canonicalPath ?? '/contact'}`;
  const title = entry?.title ?? 'Contact ClawAI';
  const description = entry?.description ?? '';

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: !noIndexEverything, follow: !noIndexEverything },
    openGraph: {
      type: 'website',
      siteName: 'ClawAI',
      title,
      description,
      url: canonical,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function ContactPage(): React.ReactElement {
  return <ContactSection />;
}
