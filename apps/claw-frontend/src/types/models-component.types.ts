import type {
  ModelCostBand,
  ModelCostClass,
  ModelFactEntry,
  ModelFactSource,
} from '@/constants/model-facts.constants';
import type { ModelProviderPage } from '@/enums/model-provider-page.enum';
import type { ModelHubCard, ModelSiblingLink } from '@/types/models.types';

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
  costBandLabel: string;
  costBandNames: Readonly<Record<ModelCostBand, string>>;
  hasNamedModels: boolean;
  models: readonly ModelFactEntry[];
  costBandByClass: Readonly<Record<ModelCostClass, ModelCostBand>>;
  source: ModelFactSource;
  sourceLabel: string;
  disclaimer: string;
  pricingHref: string;
  seePricing: string;
};
