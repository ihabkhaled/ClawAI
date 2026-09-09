import { ModelFamilyPair } from '@/enums/model-family-pair.enum';

/**
 * Nested under the existing `/compare` hub rather than a new top level.
 * `/compare` itself carries no `PRIVATE_ROUTE_PREFIXES` collision, and
 * neither does `/compare/models` — that prefix list blocks `/models` (the
 * authenticated portal catalog dashboard), not `/compare/models` (verified
 * against `constants/private-route-prefixes.constants.ts`: the match is a
 * plain `path.startsWith(prefix)` and `/compare/models` does not start with
 * `/models`, `/routing`, or any other listed prefix).
 */
export const COMPARE_MODELS_HUB_PATH = '/compare/models';
export const COMPARE_MODELS_HUB_SLUG = 'compare/models';

/**
 * When the router-behaviour claims on these pages were last checked against
 * `constants/model-facts.constants.ts` (cost class per family) and
 * `packages/shared-types/src/enums/routing-mode.enum.ts` /
 * `payg-surface.enum.ts` (routing modes and metered surfaces named in copy).
 * Move this ONLY after re-checking all three.
 */
export const COMPARE_MODELS_REVIEW_DATE = '2026-09-10';

/**
 * Render order on the hub, and generation order for the dynamic route.
 * The three-way cloud triangle first (OpenAI, Anthropic, Google — the most
 * commonly searched cloud pairs), then the cost-tier contrasts (DeepSeek,
 * xAI), then cloud-vs-local last since it is a different kind of question —
 * where a request runs, not which cloud vendor answers it — and, given
 * ClawAI's local-first positioning, the single most important pair in the
 * cluster.
 */
export const MODEL_FAMILY_PAIR_ORDER: ReadonlyArray<ModelFamilyPair> = [
  ModelFamilyPair.OPENAI_VS_ANTHROPIC,
  ModelFamilyPair.OPENAI_VS_GOOGLE,
  ModelFamilyPair.ANTHROPIC_VS_GOOGLE,
  ModelFamilyPair.OPENAI_VS_DEEPSEEK,
  ModelFamilyPair.OPENAI_VS_XAI,
  ModelFamilyPair.CLOUD_VS_LOCAL,
];

export function getModelFamilyPairPath(pair: ModelFamilyPair): string {
  return `${COMPARE_MODELS_HUB_PATH}/${pair}`;
}

export function getModelFamilyPairSlug(pair: ModelFamilyPair): string {
  return `${COMPARE_MODELS_HUB_SLUG}/${pair}`;
}

/**
 * Related pages per pair, editorial rather than computed. Every pair links
 * to `/pricing` (the "confirm the live catalog" qualifier lives on the page
 * body too), to the two named `/model-providers/<family>` pages for the
 * facts this page does not restate, and to `/model-fit` for task-based
 * guidance plus the routing-concept explainers.
 */
export const MODEL_FAMILY_PAIR_RELATED_PATHS: Readonly<
  Record<ModelFamilyPair, ReadonlyArray<string>>
> = {
  [ModelFamilyPair.OPENAI_VS_ANTHROPIC]: [
    '/model-providers/openai',
    '/model-providers/anthropic',
    '/model-fit',
    '/pricing',
  ],
  [ModelFamilyPair.OPENAI_VS_GOOGLE]: [
    '/model-providers/openai',
    '/model-providers/google',
    '/model-fit',
    '/pricing',
  ],
  [ModelFamilyPair.ANTHROPIC_VS_GOOGLE]: [
    '/model-providers/anthropic',
    '/model-providers/google',
    '/model-fit',
    '/pricing',
  ],
  [ModelFamilyPair.OPENAI_VS_DEEPSEEK]: [
    '/model-providers/openai',
    '/model-providers/deepseek',
    '/model-fit',
    '/pricing',
  ],
  [ModelFamilyPair.OPENAI_VS_XAI]: [
    '/model-providers/openai',
    '/model-providers/xai',
    '/model-fit',
    '/pricing',
  ],
  [ModelFamilyPair.CLOUD_VS_LOCAL]: [
    '/model-providers/local-ai',
    '/model-fit/private-local-workloads',
    '/learn/what-is-local-ai',
    '/pricing',
  ],
};

export function isModelFamilyPair(value: string): value is ModelFamilyPair {
  return (Object.values(ModelFamilyPair) as string[]).includes(value);
}
