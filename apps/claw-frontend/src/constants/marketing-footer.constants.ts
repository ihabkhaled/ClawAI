import { getFeatureCapabilityPath } from '@/constants/features-cluster.constants';
import { FeatureCapability } from '@/enums/feature-capability.enum';
import type { MarketingFooterCompanyLinkConfig } from '@/types/marketing.types';

export const MARKETING_FOOTER_EXPLORE_PATHS: ReadonlySet<string> = new Set([
  '/architecture',
  '/coding-agent',
  '/faq',
  '/features',
  '/features/live-intelligence',
  '/features/threads',
  '/how-it-works',
  '/integrations',
  '/learn',
  '/local-first-ai',
  '/model-fit',
  '/model-providers',
  '/prompts',
  '/security-and-privacy',
  '/supported-models',
  '/use-cases',
]);

/**
 * The Features footer column: the flagship capability pages, in this order.
 * Its own column (rather than joining Explore) so every flagship page carries
 * a site-wide inbound link without one list growing past a dozen items.
 */
export const MARKETING_FOOTER_FEATURE_PATHS: ReadonlyArray<string> = [
  FeatureCapability.MULTIMODAL_AI,
  FeatureCapability.FILES_FROM_CHAT,
  FeatureCapability.SMART_ATTACHMENTS,
  FeatureCapability.IMAGE_GENERATION,
  FeatureCapability.CHAT_MODELS_MAKE_MEDIA,
  FeatureCapability.READ_ALOUD,
  FeatureCapability.NARRATED_RESEARCH,
  FeatureCapability.ORCHESTRATION_LABS,
  FeatureCapability.CONVERSATION_TOOLS,
  FeatureCapability.PAY_AS_YOU_GO_CREDIT,
  FeatureCapability.ADMINISTRATION_AND_ACCESS,
  FeatureCapability.RELIABILITY,
].map(getFeatureCapabilityPath);

/**
 * The "Company & legal" footer column, in this order: who we are, how to reach
 * us, and every policy a customer or payment provider looks for. Short i18n
 * labels instead of registry titles ("Privacy policy", not the SEO headline).
 * `/about` and `/contact` live here only, so no destination appears twice.
 */
export const MARKETING_FOOTER_COMPANY_LINKS: ReadonlyArray<MarketingFooterCompanyLinkConfig> = [
  { path: '/about', labelKey: 'marketing.footer.linkAbout' },
  { path: '/contact', labelKey: 'marketing.footer.linkContact' },
  { path: '/privacy', labelKey: 'marketing.footer.linkPrivacy' },
  { path: '/terms', labelKey: 'marketing.footer.linkTerms' },
  { path: '/delivery-shipping', labelKey: 'marketing.footer.linkDeliveryShipping' },
  { path: '/refund-cancellation', labelKey: 'marketing.footer.linkRefundCancellation' },
  { path: '/cookies', labelKey: 'marketing.footer.linkCookies' },
  { path: '/acceptable-use', labelKey: 'marketing.footer.linkAcceptableUse' },
];
