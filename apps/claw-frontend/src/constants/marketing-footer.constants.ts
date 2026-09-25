import { getFeatureCapabilityPath } from '@/constants/features-cluster.constants';
import { FeatureCapability } from '@/enums/feature-capability.enum';

export const MARKETING_FOOTER_EXPLORE_PATHS: ReadonlySet<string> = new Set([
  '/about',
  '/architecture',
  '/coding-agent',
  '/faq',
  '/features',
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
  FeatureCapability.READ_ALOUD,
  FeatureCapability.NARRATED_RESEARCH,
  FeatureCapability.ORCHESTRATION_LABS,
  FeatureCapability.CONVERSATION_TOOLS,
  FeatureCapability.PAY_AS_YOU_GO_CREDIT,
  FeatureCapability.ADMINISTRATION_AND_ACCESS,
  FeatureCapability.RELIABILITY,
].map(getFeatureCapabilityPath);
