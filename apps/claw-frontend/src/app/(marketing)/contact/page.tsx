import type { Metadata } from 'next';

import { ContactSection } from '@/components/marketing/contact/contact-section';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata('contact');
}

export default function ContactPage(): React.ReactElement {
  return <ContactSection />;
}
