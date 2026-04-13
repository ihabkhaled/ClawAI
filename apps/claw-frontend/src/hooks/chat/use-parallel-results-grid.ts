import { useCallback, useMemo, useState } from 'react';

import type { ChatMessage, ParallelModelResponse } from '@/types';
import { getBestResponse, getFastestModel, messagesToParallelResponses } from '@/utilities';

export function useParallelResultsGrid(messages: ChatMessage[]): {
  responses: ParallelModelResponse[];
  fastestModel: string | null;
  bestModel: string | null;
  expandedIds: Set<string>;
  toggleExpanded: (model: string) => void;
} {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const responses = useMemo(() => messagesToParallelResponses(messages), [messages]);
  const fastestModel = useMemo(() => getFastestModel(responses), [responses]);
  const bestModel = useMemo(() => getBestResponse(responses), [responses]);

  const toggleExpanded = useCallback((model: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(model)) {
        next.delete(model);
      } else {
        next.add(model);
      }
      return next;
    });
  }, []);

  return { responses, fastestModel, bestModel, expandedIds, toggleExpanded };
}
