import {
  HfCategoryChoice,
  HfQualityTierChoice,
  HfSearchSort,
} from '@/enums/hf-search.enum';

export const HF_SEARCH_DEBOUNCE_MS = 350;
export const HF_SEARCH_RESULT_LIMIT = 30;
export const HF_DEFAULT_QUANTIZATION = 'Q4_K_M';

export const HF_SORT_OPTIONS: ReadonlyArray<{ value: HfSearchSort; label: string }> = [
  { value: HfSearchSort.TRENDING, label: 'Trending' },
  { value: HfSearchSort.DOWNLOADS, label: 'Most downloaded' },
  { value: HfSearchSort.LIKES, label: 'Most liked' },
  { value: HfSearchSort.LAST_MODIFIED, label: 'Recently updated' },
];

export const HF_CATEGORY_OPTIONS: ReadonlyArray<{ value: HfCategoryChoice; label: string }> = [
  { value: HfCategoryChoice.GENERAL, label: 'General' },
  { value: HfCategoryChoice.CODING, label: 'Coding' },
  { value: HfCategoryChoice.REASONING, label: 'Reasoning' },
  { value: HfCategoryChoice.THINKING, label: 'Thinking' },
  { value: HfCategoryChoice.FILE_GENERATION, label: 'File generation' },
];

export const HF_QUALITY_TIER_OPTIONS: ReadonlyArray<{
  value: HfQualityTierChoice;
  label: string;
}> = [
  { value: HfQualityTierChoice.SURVIVAL, label: 'Survival' },
  { value: HfQualityTierChoice.BALANCED, label: 'Balanced' },
  { value: HfQualityTierChoice.BEST, label: 'Best' },
];
