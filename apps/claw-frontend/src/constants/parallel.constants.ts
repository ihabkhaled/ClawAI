import { Download, Globe, ScanText, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { CompareResearchMode } from '@/enums';
import type { CompareResearchModeOption } from '@/types';

export const MIN_PARALLEL_MODELS = 2;
export const MAX_PARALLEL_MODELS = 5;
export const PARALLEL_GRID_COL_CLASSES: Record<string, string> = {
  '1': 'grid-cols-1',
  '2': 'grid-cols-2',
};
export const PARALLEL_POLL_INTERVAL_MS = 3000;
export const PARALLEL_POLL_MESSAGES_LIMIT = 50;
export const SCORE_LENGTH_DIVISOR = 1000;
export const SCORE_LATENCY_DIVISOR = 120_000;
export const SCORE_TOKEN_DIVISOR = 500;
export const SCORE_LENGTH_WEIGHT = 0.4;
export const SCORE_LATENCY_WEIGHT = 0.3;
export const SCORE_TOKEN_WEIGHT = 0.3;
export const SCORE_DEFAULT_TOKEN_VALUE = 0.5;
export const PARALLEL_CONTENT_PREVIEW_LENGTH = 300;

// Compare-mode research enricher — declarative option list so the FE control
// stays a pure render and the labels move with the i18n bundle.
export const COMPARE_RESEARCH_MODE_OPTIONS: ReadonlyArray<CompareResearchModeOption> = [
  {
    value: CompareResearchMode.NONE,
    labelKey: 'compare.research.none',
    tooltipKey: 'research.toggle.tooltipNone',
  },
  {
    value: CompareResearchMode.SEARCH,
    labelKey: 'compare.research.search',
    tooltipKey: 'research.toggle.tooltipSearch',
  },
  {
    value: CompareResearchMode.SEARCH_FETCH,
    labelKey: 'compare.research.searchFetch',
    tooltipKey: 'research.toggle.tooltipSearchFetch',
  },
  {
    value: CompareResearchMode.SEARCH_EXTRACT,
    labelKey: 'compare.research.searchExtract',
    tooltipKey: 'research.toggle.tooltipSearchExtract',
  },
];

// Icon assignments for the CompareResearchModeControl. Lives next to the
// option list so the four-mode set has a single source of truth.
export const COMPARE_RESEARCH_MODE_ICONS: Record<CompareResearchMode, LucideIcon> = {
  [CompareResearchMode.NONE]: Globe,
  [CompareResearchMode.SEARCH]: Search,
  [CompareResearchMode.SEARCH_FETCH]: Download,
  [CompareResearchMode.SEARCH_EXTRACT]: ScanText,
};
