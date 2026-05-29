import { useMemo } from 'react';

import { useCompareExportAll } from '@/hooks/chat/use-compare-export-all';
import type { ChatMessage, ParallelModelResponse } from '@/types';
import { getBestResponse, getFastestModel, messagesToParallelResponses } from '@/utilities';

export function useParallelResultsGrid(
  messages: ChatMessage[],
  prompt = '',
): {
  responses: ParallelModelResponse[];
  fastestModel: string | null;
  bestModel: string | null;
  exportAll: () => void;
} {
  // Per-card expand/scroll now lives in `useCompareResultCard`; this controller
  // only assembles the grid-level data + the combined "export all" action.
  const responses = useMemo(() => messagesToParallelResponses(messages), [messages]);
  const fastestModel = useMemo(() => getFastestModel(responses), [responses]);
  const bestModel = useMemo(() => getBestResponse(responses), [responses]);
  const { exportAll } = useCompareExportAll(prompt, responses);

  return { responses, fastestModel, bestModel, exportAll };
}
