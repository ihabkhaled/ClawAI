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
 * Render order on the hub, and generation order for the dynamic route.
 * Leads with the two capabilities every other capability in the roster
 * depends on (routing decides which model; orchestration decides how many),
 * closes with the two most specialised (observability, security).
 */
export const FEATURES_CAPABILITY_ORDER: ReadonlyArray<FeatureCapability> = [
  FeatureCapability.MODEL_ROUTING_AND_ORCHESTRATION,
  FeatureCapability.MEMORY_AND_CONTEXT,
  FeatureCapability.WORKSPACE_CONNECTORS,
  FeatureCapability.FILE_AND_DOCUMENT_HANDLING,
  FeatureCapability.OBSERVABILITY_AND_TRANSPARENCY,
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
};

export function isFeatureCapability(value: string): value is FeatureCapability {
  return (Object.values(FeatureCapability) as string[]).includes(value);
}
