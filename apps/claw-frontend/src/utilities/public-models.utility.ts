import { MODEL_PAGE_CONNECTOR_PROVIDERS } from '@/constants/model-provider-mapping.constants';
import type { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { PublicCatalogModel, PublicModelCatalog } from '@/types/public-models.types';

/**
 * Every live model behind one `/models/<provider>` page.
 *
 * A page can cover more than one connector — `local-ai` covers Ollama and
 * llama.cpp — so this concatenates, then sorts by display name. Sorting matters
 * more than it looks: the catalog arrives in the database's order, which shifts
 * whenever an administrator re-syncs, and a list that reorders itself between
 * deploys makes two identical pages look different to a reader and to a diff.
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
    .filter((provider) => connectorProviders.includes(provider.provider))
    .flatMap((provider) => provider.models)
    .toSorted((left, right) => left.displayName.localeCompare(right.displayName));
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
