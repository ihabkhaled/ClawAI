import { FeatureCapability } from '@/enums/feature-capability.enum';

/**
 * The existing `/features` page becomes a hub here (F4 of the SEO content
 * architecture doc): same URL, no redirect, no lost equity. Named
 * `features-cluster` rather than `features` to avoid a collision with the
 * existing `marketing-features.constants.ts` (the legacy nine-section
 * descriptors, kept as-is on the hub).
 */
export const FEATURES_HUB_PATH = '/features';
export const FEATURES_HUB_SLUG = 'features';

/**
 * When the claims on these pages were last checked against
 * `packages/shared-types/src/enums/plan-feature.enum.ts`,
 * `packages/shared-types/src/enums/payg-surface.enum.ts`,
 * `packages/shared-types/src/enums/workspace-provider.enum.ts`,
 * `packages/shared-types/src/enums/routing-mode.enum.ts` and the
 * `marketing.features.*` i18n dictionary. Move this ONLY after re-checking
 * all five.
 */
export const FEATURES_REVIEW_DATE = '2026-09-09';

/**
 * When the flagship pages' claims (multimodal, files, attachments, research,
 * labs, conversation tools, read aloud, images, reliability, pay-as-you-go
 * credit, administration) were last checked against shipped code. Kept apart
 * from `FEATURES_REVIEW_DATE` so moving one never implies re-checking the
 * other set.
 */
export const FEATURES_FLAGSHIP_REVIEW_DATE = '2026-09-26';

const FEATURES_FOUNDATION_CAPABILITIES: ReadonlySet<FeatureCapability> = new Set([
  FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION,
  FeatureCapability.MEMORY_AND_CONTEXT,
  FeatureCapability.WORKSPACE_CONNECTORS,
  FeatureCapability.FILE_AND_DOCUMENT_HANDLING,
  FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY,
  FeatureCapability.SECURITY_AND_DATA_HANDLING,
]);

export function getFeatureCapabilityReviewDate(capability: FeatureCapability): string {
  return FEATURES_FOUNDATION_CAPABILITIES.has(capability)
    ? FEATURES_REVIEW_DATE
    : FEATURES_FLAGSHIP_REVIEW_DATE;
}

/**
 * Render order on the hub, and generation order for the dynamic route.
 * Grouped the way a visitor meets the product: what you can put in and get
 * out of a conversation first, then how models are chosen and combined, then
 * working with conversations, then money and administration, and the
 * trust pages (observability, reliability, security) last.
 */
export const FEATURES_CAPABILITY_ORDER: ReadonlyArray<FeatureCapability> = [
  FeatureCapability.MULTIMODAL_AI,
  FeatureCapability.SMART_ATTACHMENTS,
  FeatureCapability.FILES_FROM_CHAT,
  FeatureCapability.IMAGE_GENERATION,
  FeatureCapability.READ_ALOUD,
  FeatureCapability.NARRATED_RESEARCH,
  FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION,
  FeatureCapability.ORCHESTRATION_LABS,
  FeatureCapability.CONVERSATION_TOOLS,
  FeatureCapability.MEMORY_AND_CONTEXT,
  FeatureCapability.FILE_AND_DOCUMENT_HANDLING,
  FeatureCapability.WORKSPACE_CONNECTORS,
  FeatureCapability.PAY_AS_YOU_GO_CREDIT,
  FeatureCapability.ADMINISTRATION_AND_ACCESS,
  FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY,
  FeatureCapability.RELIABILITY,
  FeatureCapability.SECURITY_AND_DATA_HANDLING,
];

export function getFeatureCapabilityPath(capability: FeatureCapability): string {
  return `${FEATURES_HUB_PATH}/${capability}`;
}

export function getFeatureCapabilitySlug(capability: FeatureCapability): string {
  return `${FEATURES_HUB_SLUG}/${capability}`;
}

/**
 * Related pages per capability, editorial rather than computed. Cross-links
 * to `/learn/*` rather than re-explaining a concept already covered there,
 * and to `/use-cases/*` for the job-shaped version of the same capability.
 */
export const FEATURES_RELATED_PATHS: Readonly<Record<FeatureCapability, ReadonlyArray<string>>> = {
  [FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION]: [
    '/learn/what-is-llm-orchestration',
    '/learn/what-is-ai-model-routing',
    '/learn/what-is-model-fallback',
    '/use-cases/comparing-model-answers',
  ],
  [FeatureCapability.MEMORY_AND_CONTEXT]: [
    '/learn/what-is-ai-memory',
    '/learn/what-is-a-context-window',
    '/learn/what-are-context-packs',
    '/use-cases/writing-and-editing',
  ],
  [FeatureCapability.WORKSPACE_CONNECTORS]: [
    '/integrations',
    '/use-cases/workspace-automation',
    '/use-cases/coding-and-development',
  ],
  [FeatureCapability.FILE_AND_DOCUMENT_HANDLING]: [
    '/learn/what-are-structured-ai-outputs',
    '/learn/how-ai-tool-calling-works',
    '/use-cases/structured-data-extraction',
  ],
  [FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY]: [
    '/learn/what-is-ai-model-routing',
    '/learn/what-is-model-fallback',
    '/pricing',
  ],
  [FeatureCapability.SECURITY_AND_DATA_HANDLING]: [
    '/security-and-privacy',
    '/local-first-ai',
    '/use-cases/private-and-local-deployment',
  ],
  [FeatureCapability.MULTIMODAL_AI]: [
    '/features/smart-attachments',
    '/features/read-aloud',
    '/features/model-routing-and-orchestration',
  ],
  [FeatureCapability.FILES_FROM_CHAT]: [
    '/features/file-and-document-handling',
    '/features/conversation-power-tools',
    '/use-cases/structured-data-extraction',
  ],
  [FeatureCapability.SMART_ATTACHMENTS]: [
    '/features/file-and-document-handling',
    '/features/multimodal-ai',
    '/security-and-privacy',
  ],
  [FeatureCapability.NARRATED_RESEARCH]: [
    '/learn/how-ai-tool-calling-works',
    '/features/observability-and-transparency',
    '/use-cases/research-and-fact-finding',
  ],
  [FeatureCapability.ORCHESTRATION_LABS]: [
    '/features/model-routing-and-orchestration',
    '/learn/what-is-llm-orchestration',
    '/use-cases/comparing-model-answers',
  ],
  [FeatureCapability.CONVERSATION_TOOLS]: [
    '/features/memory-and-context',
    '/features/files-from-chat',
    '/learn/what-is-a-context-window',
  ],
  [FeatureCapability.READ_ALOUD]: [
    '/features/multimodal-ai',
    '/features/conversation-power-tools',
    '/pricing',
  ],
  [FeatureCapability.IMAGE_GENERATION]: [
    '/features/multimodal-ai',
    '/features/pay-as-you-go-credit',
    '/pricing',
  ],
  [FeatureCapability.RELIABILITY]: [
    '/learn/what-is-model-fallback',
    '/features/observability-and-transparency',
    '/architecture',
  ],
  [FeatureCapability.PAY_AS_YOU_GO_CREDIT]: [
    '/pricing',
    '/features/observability-and-transparency',
    '/model-providers',
  ],
  [FeatureCapability.ADMINISTRATION_AND_ACCESS]: [
    '/local-first-ai',
    '/security-and-privacy',
    '/coding-agent',
  ],
};

export function isFeatureCapability(value: string): value is FeatureCapability {
  return (Object.values(FeatureCapability) as string[]).includes(value);
}
