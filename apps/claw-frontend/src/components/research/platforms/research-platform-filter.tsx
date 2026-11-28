import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RESEARCH_PLATFORM_CATEGORIES,
  RESEARCH_PLATFORM_CATEGORY_KEYS,
  RESEARCH_PLATFORM_FILTER_ALL,
} from '@/constants/research-platform.constants';
import type { ResearchPlatformFilterProps } from '@/types/research-platform.types';

/** The category filter above the groups ("All categories" or one category). */
export function ResearchPlatformFilter({
  t,
  value,
  onChange,
}: ResearchPlatformFilterProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor="research-platform-filter" className="text-sm font-medium">
        {t('researchPlatforms.filterLabel')}
      </label>
      <Select value={value} onValueChange={onChange} name="research-platform-filter">
        <SelectTrigger
          id="research-platform-filter"
          className="w-full sm:w-64"
          data-testid="research-platform-filter"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={RESEARCH_PLATFORM_FILTER_ALL}>
            {t('researchPlatforms.filterAll')}
          </SelectItem>
          {RESEARCH_PLATFORM_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {t(RESEARCH_PLATFORM_CATEGORY_KEYS[category])}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
