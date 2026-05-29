import { useState } from 'react';

import { CompareResultViewMode } from '@/enums';
import type { UseCompareResultCardReturn } from '@/types';
import type { TranslateFunction } from '@/types/i18n.types';
import type { ParallelModelResponse } from '@/types/parallel.types';
import {
  buildCompareResultMarkdown,
  copyTextToClipboard,
  downloadMarkdownFile,
  showToast,
} from '@/utilities';

export function useCompareResultCard(
  response: ParallelModelResponse,
  t: TranslateFunction,
): UseCompareResultCardReturn {
  const [viewMode, setViewMode] = useState<CompareResultViewMode>(CompareResultViewMode.MARKDOWN);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleViewMode = (): void => {
    setViewMode((mode) =>
      mode === CompareResultViewMode.MARKDOWN
        ? CompareResultViewMode.RAW
        : CompareResultViewMode.MARKDOWN,
    );
  };

  const copyContent = (): void => {
    void copyTextToClipboard(response.content).then((ok) => {
      if (!ok) {
        showToast.error({ description: t('compare.copyFailed') });
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const exportMarkdown = (): void => {
    downloadMarkdownFile(
      `compare-${response.model}`,
      buildCompareResultMarkdown({
        provider: response.provider,
        model: response.model,
        content: response.content,
        latencyMs: response.latencyMs,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        createdAt: response.message?.createdAt ?? null,
      }),
    );
  };

  return { viewMode, expanded, copied, toggleViewMode, setExpanded, copyContent, exportMarkdown };
}
