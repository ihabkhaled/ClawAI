import { MODEL_PAGE_CONNECTOR_PROVIDERS } from '@/constants/model-provider-mapping.constants';
import type { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { PublicCatalogModel, PublicModelCatalog } from '@/types/public-models.types';
import { compareModelsByRecency } from '@/utilities/model-recency.utility';

/**
 * Newest first, using the SAME comparator the in-app model picker uses.
 *
 * Reusing it is the point. The picker was fixed first and the public pages were
 * left on the backend's alphabetical order, so the home page advertised
 * "Chatgpt Image Latest" and "GPT 3.5 Turbo" as its OpenAI sample while the
 * picker showed GPT 5.6 — the same product describing itself two different
 * ways. A second comparator here would have re-created that split the first
 * time either was tuned.
 *
 * The catalog model is adapted to the comparator's shape rather than the
 * comparator being widened: `provider` matters because the primary-line rule
 * (Gemini before Gemma) is looked up by it.
 */
export function sortCatalogModelsByRecency(
  provider: string,
  models: readonly PublicCatalogModel[],
): readonly PublicCatalogModel[] {
  return models
    .map((model) => ({
      model,
      sortable: { provider, model: model.modelKey, displayName: model.displayName },
    }))
    .sort((left, right) => compareModelsByRecency(left.sortable, right.sortable))
    .map((entry) => entry.model);
}

/**
 * Every live model behind one `/models/<provider>` page.
 *
 * A page can cover more than one connector — `local-ai` covers Ollama and
 * llama.cpp — so this concatenates, newest first within each.
 *
 * Ordering matters more than it looks. The catalog arrives in the database's
 * order, which shifts whenever an administrator re-syncs, so an unsorted list
 * makes two identical pages look different to a reader and to a diff. And
 * sorting by NAME, which is what this did first, is close to reverse
 * chronological for model names — it reliably showed the oldest thing a
 * provider still serves.
 */
export function selectModelsForProviderPage(
  catalog: PublicModelCatalog | null,
  page: ModelProviderPage,
): readonly PublicCatalogModel[] {
  if (catalog === null) {
    return [];
  }
  const connectorProviders = MODEL_PAGE_CONNECTOR_PROVIDERS[page];
  return catalog.providers
    .filter((candidate) => connectorProviders.includes(candidate.provider))
    .flatMap((candidate) => sortCatalogModelsByRecency(candidate.provider, candidate.models));
}

/**
 * The provider names to show on a hub or landing page.
 *
 * Only providers that actually have a model: a connector configured but never
 * synced contributes nothing a visitor can use, and naming it would promise
 * something this deployment cannot deliver.
 */
export function selectAvailableProviderNames(
  catalog: PublicModelCatalog | null,
): readonly string[] {
  if (catalog === null) {
    return [];
  }
  return catalog.providers
    .filter((provider) => provider.modelCount > 0)
    .map((provider) => provider.displayName);
}
