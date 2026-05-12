import {
  RouterModelsLifecycleFilter,
  RouterModelsRouterOnlyFilter,
} from '@/enums/router-models-filter.enum';
import { RouterModelLifecycle } from '@/enums/router-models.enum';

/// Map the page-filter enum (which includes ALL) to the API lifecycle enum.
/// Returns undefined when the filter is ALL.
export function mapLifecycleFilter(
  filter: RouterModelsLifecycleFilter,
): RouterModelLifecycle | undefined {
  switch (filter) {
    case RouterModelsLifecycleFilter.ALL:
      return undefined;
    case RouterModelsLifecycleFilter.ACTIVE:
      return RouterModelLifecycle.ACTIVE;
    case RouterModelsLifecycleFilter.PREVIEW:
      return RouterModelLifecycle.PREVIEW;
    case RouterModelsLifecycleFilter.DEPRECATED:
      return RouterModelLifecycle.DEPRECATED;
    case RouterModelsLifecycleFilter.DISABLED:
      return RouterModelLifecycle.DISABLED;
    case RouterModelsLifecycleFilter.REMOVED:
      return RouterModelLifecycle.REMOVED;
  }
}

export function mapRouterOnlyFilter(filter: RouterModelsRouterOnlyFilter): boolean | undefined {
  switch (filter) {
    case RouterModelsRouterOnlyFilter.ALL:
      return undefined;
    case RouterModelsRouterOnlyFilter.ROUTER_ONLY:
      return true;
    case RouterModelsRouterOnlyFilter.EXECUTION_ONLY:
      return false;
  }
}
