import type { ModelFamilyPair } from '@/enums/model-family-pair.enum';
import type { CompareModelsHubCard, CompareModelsSiblingLink } from '@/types/compare-models.types';

export type CompareModelsHubCardsProps = {
  cards: ReadonlyArray<CompareModelsHubCard>;
};

export type CompareModelsRailProps = {
  label: string;
  items: ReadonlyArray<CompareModelsSiblingLink>;
};

export type CompareModelsPairPageProps = {
  pair: ModelFamilyPair;
};
