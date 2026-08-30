import type { Metadata } from 'next';

import { LearnHubPage } from '@/components/marketing/learn/learn-hub-page';
import { LEARN_HUB_SLUG } from '@/constants/learn.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(LEARN_HUB_SLUG);
}

export default function LearnPage(): Promise<React.ReactElement> {
  return LearnHubPage();
}
