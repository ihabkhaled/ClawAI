import { ModelProviderPage } from '@/enums/model-provider-page.enum';

/**
 * The single source of truth for which models `/models/*` may name, and what
 * it may say about them.
 *
 * GROUNDING (non-negotiable — see `docs/05-frontend/seo-content-architecture.md`
 * §3 and §8.1).
 *
 * 1. The model list, provider and cost class are copied by hand from
 *    `apps/claw-routing-service/src/modules/router-models/constants/model-cost-seed.constants.ts`
 *    (re-verified against that file on 2026-09-09 — 16 models, 5 cloud
 *    providers). That file's own header says its numbers are LIST-price
 *    ESTIMATES to verify, not a contract, which is exactly why this module
 *    never republishes an exact price — only the qualitative `costBand`
 *    derived from `costClass`.
 * 2. `cloud-model-intelligence.constants.ts` is NOT a source, and never may
 *    be. Its own header attributes a latency claim to "ClawAI's router
 *    benchmark suite (see qa/routing-latency-baseline/)" — that directory
 *    does not exist, so the claim has a fabricated citation. It also carries
 *    unsourced disparagement of named competitors (`weakDomains`,
 *    `avoidFor`) and lists providers with no `ConnectorProvider` member
 *    (Mistral, Cohere, Qwen, Moonshot/Kimi) — publishing any of that would be
 *    trade-libel exposure and would silently undo the F6 refusal.
 * 3. NO SPEED OR LATENCY CLAIM MAY EVER APPEAR HERE, qualitatively or
 *    otherwise, until a real, in-repo measurement exists. There is none
 *    today.
 * 4. Every fact needs a `source` label and a real vendor URL. A fact this
 *    file cannot cite is not added — omit it rather than invent a citation.
 * 5. This is a FRONTEND-OWNED module, not a live read of routing-service.
 *    Crossing that boundary was considered and rejected (§8.6): it would
 *    require a new unauthenticated endpoint exposing a full provider rate
 *    card (a margin input), it would make a marketing page vary by
 *    deployment, and it would put a runtime cross-service call on the SEO
 *    critical path. `MODEL_COST_SEED_VERSION` (currently 1) is the drift
 *    trigger (D1): if that seed changes or its version bumps, this file is
 *    stale until re-diffed by hand.
 *
 * AWS Bedrock is a real `ConnectorProvider` member but has no model sync
 * implemented (F2) — it is deliberately absent from this file and has no
 * page. Qwen, Kimi and GLM have no `ConnectorProvider` member at all (F6) —
 * also absent.
 */

/**
 * Mirrors routing-service's generated `CostClass` (Prisma enum), by value,
 * not by import — the frontend workspace cannot import routing-service's
 * generated Prisma client across the service boundary. Four values, verified
 * against `model-cost-seed.constants.ts` on 2026-09-09.
 */
export type ModelCostClass = 'CHEAP' | 'STANDARD' | 'PREMIUM' | 'ULTRA';

/**
 * The qualitative cost band a page may print. Never an exact per-token price
 * — the seed file's own numbers are estimates, and publishing them as current
 * would misrepresent an estimate as a contract.
 */
export type ModelCostBand = 'budget' | 'standard' | 'premium' | 'highest';

export const MODEL_COST_BAND_BY_CLASS: Readonly<Record<ModelCostClass, ModelCostBand>> = {
  CHEAP: 'budget',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  ULTRA: 'highest',
};

export type ModelFactEntry = {
  /** The `modelKey` in `model-cost-seed.constants.ts`. */
  modelKey: string;
  /** Display name a reader would recognise, not the raw model key. */
  displayName: string;
  costClass: ModelCostClass;
};

export type ModelFactSource = {
  /** Human-readable citation, e.g. "OpenAI pricing". */
  label: string;
  /** A real vendor URL. Never fabricated — omit the fact rather than guess one. */
  url: string;
};

export type ModelProviderFacts = {
  displayName: string;
  /**
   * Whether this page names specific seeded models. `false` for local AI,
   * where models are open-weight and operator-chosen rather than a fixed
   * catalog — naming specific ones would be arbitrary and would date fast.
   */
  hasNamedModels: boolean;
  models: readonly ModelFactEntry[];
  source: ModelFactSource;
};

export const MODEL_FACTS_REVIEW_DATE = '2026-09-09';

export const MODEL_FACTS: Readonly<Record<ModelProviderPage, ModelProviderFacts>> = {
  [ModelProviderPage.OPENAI]: {
    displayName: 'OpenAI',
    hasNamedModels: true,
    models: [
      { modelKey: 'gpt-5', displayName: 'GPT-5', costClass: 'PREMIUM' },
      { modelKey: 'gpt-5-mini', displayName: 'GPT-5 mini', costClass: 'STANDARD' },
      { modelKey: 'gpt-4o', displayName: 'GPT-4o', costClass: 'PREMIUM' },
      { modelKey: 'gpt-4o-mini', displayName: 'GPT-4o mini', costClass: 'CHEAP' },
      { modelKey: 'o3', displayName: 'o3', costClass: 'PREMIUM' },
      { modelKey: 'o4-mini', displayName: 'o4-mini', costClass: 'STANDARD' },
    ],
    source: { label: 'OpenAI pricing', url: 'https://openai.com/api/pricing/' },
  },
  [ModelProviderPage.ANTHROPIC]: {
    displayName: 'Anthropic',
    hasNamedModels: true,
    models: [
      { modelKey: 'claude-opus-4', displayName: 'Claude Opus 4', costClass: 'ULTRA' },
      { modelKey: 'claude-sonnet-4', displayName: 'Claude Sonnet 4', costClass: 'PREMIUM' },
      { modelKey: 'claude-haiku-4-5', displayName: 'Claude Haiku 4.5', costClass: 'STANDARD' },
    ],
    source: { label: 'Anthropic pricing', url: 'https://www.anthropic.com/pricing' },
  },
  [ModelProviderPage.GOOGLE]: {
    displayName: 'Google Gemini',
    hasNamedModels: true,
    models: [
      { modelKey: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', costClass: 'PREMIUM' },
      { modelKey: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', costClass: 'STANDARD' },
      {
        modelKey: 'gemini-2.5-flash-lite',
        displayName: 'Gemini 2.5 Flash-Lite',
        costClass: 'CHEAP',
      },
    ],
    source: { label: 'Google AI pricing', url: 'https://ai.google.dev/pricing' },
  },
  [ModelProviderPage.DEEPSEEK]: {
    displayName: 'DeepSeek',
    hasNamedModels: true,
    models: [
      { modelKey: 'deepseek-chat', displayName: 'DeepSeek Chat', costClass: 'STANDARD' },
      { modelKey: 'deepseek-reasoner', displayName: 'DeepSeek Reasoner', costClass: 'STANDARD' },
    ],
    source: {
      label: 'DeepSeek API pricing',
      url: 'https://platform.deepseek.com/api-docs/pricing/',
    },
  },
  [ModelProviderPage.XAI]: {
    displayName: 'xAI Grok',
    hasNamedModels: true,
    models: [
      { modelKey: 'grok-4', displayName: 'Grok 4', costClass: 'PREMIUM' },
      { modelKey: 'grok-3-mini', displayName: 'Grok 3 mini', costClass: 'CHEAP' },
    ],
    source: { label: 'xAI API docs', url: 'https://docs.x.ai/docs/models' },
  },
  // Ollama and llama.cpp are both real `ConnectorProvider` members that run
  // open-weight, operator-chosen models — there is no fixed catalog to seed
  // a cost class from, so no models are listed and no cost band is claimed.
  [ModelProviderPage.LOCAL_AI]: {
    displayName: 'Local AI (Ollama and llama.cpp)',
    hasNamedModels: false,
    models: [],
    source: { label: 'Ollama library', url: 'https://ollama.com/library' },
  },
};
