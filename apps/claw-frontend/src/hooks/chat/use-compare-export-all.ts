import type { ParallelModelResponse } from '@/types/parallel.types';
import { buildCompareRunMarkdown, downloadMarkdownFile } from '@/utilities';

export function useCompareExportAll(
  prompt: string,
  responses: ParallelModelResponse[],
): { exportAll: () => void } {
  const exportAll = (): void => {
    const markdown = buildCompareRunMarkdown(prompt, responses);
    downloadMarkdownFile('compare-run', markdown);
  };

  return { exportAll };
}
