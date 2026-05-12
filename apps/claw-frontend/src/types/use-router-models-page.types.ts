import type {
  RouterModelsLifecycleFilter,
  RouterModelsRouterOnlyFilter,
} from '@/enums/router-models-filter.enum';
import type {
  CostClass,
  PrivacyClass,
  QualityTier,
  RouterModelLifecycle,
} from '@/enums/router-models.enum';

import type {
  ListRouterModelsQuery,
  RouterModel,
  RouterModelsListMeta,
} from './router-models.types';

export type RouterModelsPageFilters = {
  search: string;
  provider: string;
  lifecycle: RouterModelsLifecycleFilter;
  isRouterOnly: RouterModelsRouterOnlyFilter;
};

export type UseRouterModelsPageResult = {
  models: RouterModel[];
  meta: RouterModelsListMeta | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  filters: RouterModelsPageFilters;
  setFilter: <K extends keyof RouterModelsPageFilters>(
    key: K,
    value: RouterModelsPageFilters[K],
  ) => void;
  resetFilters: () => void;
  queryArgs: ListRouterModelsQuery;
};

export type RouterModelRowDisplay = {
  id: string;
  provider: string;
  modelKey: string;
  displayName: string;
  isLocal: boolean;
  isRouterOnly: boolean;
  lifecycle: RouterModelLifecycle;
  qualityTier: QualityTier;
  costClass: CostClass | null;
  costConfidenceLabel: string;
  privacy: PrivacyClass;
  latencyP95Ms: number | null;
};
