import type { CompareResultViewMode } from '@/enums';

/**
 * Input for building the Markdown document of a single compare result.
 */
export type CompareResultMarkdownInput = {
  provider: string;
  model: string;
  content: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt?: string | null;
};

/**
 * Controller-hook return type for a single compare result card.
 */
export type UseCompareResultCardReturn = {
  viewMode: CompareResultViewMode;
  expanded: boolean;
  copied: boolean;
  toggleViewMode: () => void;
  setExpanded: (value: boolean) => void;
  copyContent: () => void;
  exportMarkdown: () => void;
};
