import { AssistantModelRole, RouterProvider } from '../../../generated/prisma';
import type { AssistantModelSeedEntry } from '../types/assistant-model.types';

export const ASSISTANT_MODEL_SEED_NAME = 'assistant-models-default';
export const ASSISTANT_MODEL_SEED_VERSION = 1;
/** Distinct from the chain seed's lock so the two never serialise on each other. */
export const ASSISTANT_MODEL_SEED_LOCK_ID = 740_040_003;

/**
 * The default research-gate candidates.
 *
 * Every alias here names a model the catalog actually holds. That is not a
 * detail: an alias resolves to a deployment exactly or not at all, and the
 * router chain shipped for a month naming three models that did not exist,
 * each silently skipped on every request.
 *
 * Ordered and CLOUD-FIRST because the gate fails closed. A gate that cannot
 * reach a model answers "this turn does not need the web", so a local-only
 * default on a production box that runs no local Ollama does not fail loudly —
 * it just quietly turns the feature off and looks implemented.
 *
 * Seeded once. Afterwards it is the admin page's to change, which is the point:
 * choosing the model is an operator decision, not a redeploy.
 */
export const ASSISTANT_MODEL_SEED_ENTRIES: readonly AssistantModelSeedEntry[] = Object.freeze([
  {
    role: AssistantModelRole.RESEARCH_GATE,
    order: 1,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'gpt-oss:20b',
    timeoutMs: 6_000,
    maxTokens: 64,
  },
  {
    role: AssistantModelRole.RESEARCH_GATE,
    order: 2,
    provider: RouterProvider.OLLAMA_CLOUD,
    modelAlias: 'glm-5.2',
    timeoutMs: 6_000,
    maxTokens: 64,
  },
  {
    // Last, and local: right on a laptop, absent in production. It answers when
    // nothing else is reachable rather than being the first thing tried.
    role: AssistantModelRole.RESEARCH_GATE,
    order: 3,
    provider: RouterProvider.OLLAMA,
    modelAlias: 'qwen3:1.7b',
    timeoutMs: 6_000,
    maxTokens: 64,
  },
]);
