import { ModelProviderPage } from '@/enums/model-provider-page.enum';

// NOTE: not `/models` — that path is already a private, authenticated portal
// route (`src/app/(portal)/models/**`, the model catalog/discovery
// dashboard). Publishing a marketing page at the same path would collide
// with it, so this cluster lives at `/model-providers` instead. Deviation
// from the path named in the SEO content architecture doc, forced by a real
// route that doc did not check against.
export const MODELS_HUB_PATH = '/model-providers';
export const MODELS_HUB_SLUG = 'model-providers';

/**
 * When the claims on these pages were last checked against
 * `apps/claw-routing-service/src/modules/router-models/constants/model-cost-seed.constants.ts`
 * plus public vendor documentation. Move this ONLY after re-diffing that file
 * against `model-facts.constants.ts` — see the header there.
 */
export const MODELS_REVIEW_DATE = '2026-09-09';

/**
 * Render order on the hub, and generation order for the dynamic route.
 * Cloud providers first, largest catalog to smallest, local-first last since
 * it is a different kind of page (a mechanism, not a vendor catalog).
 */
export const MODEL_PROVIDER_ORDER: ReadonlyArray<ModelProviderPage> = [
  ModelProviderPage.OPENAI,
  ModelProviderPage.ANTHROPIC,
  ModelProviderPage.GOOGLE,
  ModelProviderPage.DEEPSEEK,
  ModelProviderPage.XAI,
  ModelProviderPage.LOCAL_AI,
];

export function getModelProviderPath(provider: ModelProviderPage): string {
  return `${MODELS_HUB_PATH}/${provider}`;
}

export function getModelProviderSlug(provider: ModelProviderPage): string {
  return `${MODELS_HUB_SLUG}/${provider}`;
}

/**
 * Related pages per provider, editorial rather than computed. Every provider
 * links to `/pricing` (the "confirm the live catalog" qualifier lives on the
 * page body too, but the rail reinforces it) and to the two evaluation
 * explainers rather than re-explaining evaluation methodology on each page.
 */
export const MODEL_PROVIDER_RELATED_PATHS: Readonly<
  Record<ModelProviderPage, ReadonlyArray<string>>
> = {
  [ModelProviderPage.OPENAI]: [
    '/pricing',
    '/learn/how-to-evaluate-ai-models',
    '/learn/how-to-read-ai-benchmarks',
  ],
  [ModelProviderPage.ANTHROPIC]: [
    '/pricing',
    '/learn/how-to-evaluate-ai-models',
    '/learn/how-to-read-ai-benchmarks',
  ],
  [ModelProviderPage.GOOGLE]: [
    '/pricing',
    '/learn/how-to-evaluate-ai-models',
    '/learn/how-to-read-ai-benchmarks',
  ],
  [ModelProviderPage.DEEPSEEK]: [
    '/pricing',
    '/learn/how-to-evaluate-ai-models',
    '/learn/how-to-read-ai-benchmarks',
  ],
  [ModelProviderPage.XAI]: [
    '/pricing',
    '/learn/how-to-evaluate-ai-models',
    '/learn/how-to-read-ai-benchmarks',
  ],
  [ModelProviderPage.LOCAL_AI]: [
    '/local-first-ai',
    '/learn/what-is-local-ai',
    '/learn/ollama-vs-llamacpp',
  ],
};

export function isModelProviderPage(value: string): value is ModelProviderPage {
  return (Object.values(ModelProviderPage) as string[]).includes(value);
}
