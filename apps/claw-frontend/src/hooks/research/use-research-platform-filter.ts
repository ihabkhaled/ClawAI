import { useMemo, useState } from 'react';

import { RESEARCH_PLATFORM_FILTER_ALL } from '@/constants/research-platform.constants';
import type {
  ResearchPlatform,
  UseResearchPlatformFilterReturn,
} from '@/types/research-platform.types';
import {
  groupResearchPlatforms,
  parseResearchPlatformCategoryFilter,
} from '@/utilities/research-platform.utility';

/** The category filter and the platforms grouped by category under it. */
export function useResearchPlatformFilter(
  platforms: readonly ResearchPlatform[],
): UseResearchPlatformFilterReturn {
  const [filterValue, setFilterValue] = useState<string>(RESEARCH_PLATFORM_FILTER_ALL);
  const category = parseResearchPlatformCategoryFilter(filterValue);
  const groups = useMemo(() => groupResearchPlatforms(platforms, category), [platforms, category]);
  return { category, filterValue, onFilterChange: setFilterValue, groups };
}
