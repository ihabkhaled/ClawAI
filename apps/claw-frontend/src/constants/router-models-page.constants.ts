import {
  RouterModelsLifecycleFilter,
  RouterModelsRouterOnlyFilter,
} from '@/enums/router-models-filter.enum';
import type { RouterModelsPageFilters } from '@/types/use-router-models-page.types';

export const ROUTER_MODELS_PAGE_SIZE = 50;

export const ROUTER_MODELS_DEFAULT_FILTERS: Readonly<RouterModelsPageFilters> = Object.freeze({
  search: '',
  provider: 'ALL',
  lifecycle: RouterModelsLifecycleFilter.ALL,
  isRouterOnly: RouterModelsRouterOnlyFilter.ALL,
});

export const ROUTER_MODELS_PROVIDER_OPTIONS: ReadonlyArray<string> = Object.freeze([
  'ALL',
  'OPENAI',
  'ANTHROPIC',
  'GEMINI',
  'GROK',
  'BEDROCK',
  'DEEPSEEK',
  'OLLAMA',
  'LLAMACPP',
]);

export const ROUTER_MODELS_LIFECYCLE_OPTIONS: ReadonlyArray<RouterModelsLifecycleFilter> =
  Object.freeze(Object.values(RouterModelsLifecycleFilter));

export const ROUTER_MODELS_ROUTER_ONLY_OPTIONS: ReadonlyArray<RouterModelsRouterOnlyFilter> =
  Object.freeze(Object.values(RouterModelsRouterOnlyFilter));
