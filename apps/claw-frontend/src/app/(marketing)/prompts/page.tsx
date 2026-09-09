import type { Metadata } from 'next';

import { PromptGuideHubPage } from '@/components/marketing/prompts/prompt-guide-hub-page';
import { PROMPTS_HUB_SLUG } from '@/constants/prompts.constants';
import { buildRequestPublicPageMetadata } from '@/lib/seo/public-page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildRequestPublicPageMetadata(PROMPTS_HUB_SLUG);
}

export default function PromptsPage(): Promise<React.ReactElement> {
  return PromptGuideHubPage();
}
