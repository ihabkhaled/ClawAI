import type { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelHubCard, ModelSiblingLink } from '@/types/models.types';
import type { PublicCatalogModel } from '@/types/public-models.types';

export type ModelHubCardsProps = {
  cards: ReadonlyArray<ModelHubCard>;
};

export type ModelRailProps = {
  label: string;
  items: ReadonlyArray<ModelSiblingLink>;
};

export type ModelProviderPageProps = {
  provider: ModelProviderPage;
};

export type ModelCatalogProps = {
  heading: string;
  /** Live models for this provider, already sorted. */
  models: readonly PublicCatalogModel[];
  /** How many this provider has in total, before the visible limit. */
  totalCount: number;
  visibleLimit: number;
  /** True when the catalog could not be read — never when it is merely empty. */
  isUnavailable: boolean;
  unavailableNote: string;
  /** Contains `{count}`, replaced with how many models are not shown. */
  moreLabel: string;
  contextLabel: string;
  capabilityLabels: { vision: string; tools: string; audio: string };
  disclaimer: string;
  pricingHref: string;
  seePricing: string;
};
