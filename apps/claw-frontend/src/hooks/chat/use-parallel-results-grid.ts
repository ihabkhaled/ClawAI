import { useMemo } from 'react';

import type { ChatMessage, ParallelModelResponse } from '@/types';
import { getBestResponse, getFastestModel, messagesToParallelResponses } from '@/utilities';

export function useParallelResultsGrid(messages: ChatMessage[]): {
  responses: ParallelModelResponse[];
  fastestModel: string | null;
  bestModel: string | null;
} {
  // The grid renders every response in full — no per-card expand/collapse —
  // because side-by-side compare loses its purpose when responses are
  // truncated. Removed `expandedIds` / `toggleExpanded` state along with
  // the 300-char preview in parallel-results-grid.tsx.
  const responses = useMemo(() => messagesToParallelResponses(messages), [messages]);
  const fastestModel = useMemo(() => getFastestModel(responses), [responses]);
  const bestModel = useMemo(() => getBestResponse(responses), [responses]);

  return { responses, fastestModel, bestModel };
}
