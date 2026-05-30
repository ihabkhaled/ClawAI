import { useMemo } from 'react';

import type { ChatMessage, ParallelModelResponse } from '@/types';
import { getBestResponse, getFastestModel, messageToParallelResponse } from '@/utilities';

export function useParallelMessageGroup(messages: ChatMessage[]): {
  responses: ParallelModelResponse[];
  fastestModel: string | null;
  bestModel: string | null;
} {
  const responses = useMemo(
    () => messages.map((message) => messageToParallelResponse(message)),
    [messages],
  );

  const fastestModel = useMemo(() => getFastestModel(responses), [responses]);
  const bestModel = useMemo(() => getBestResponse(responses), [responses]);

  return { responses, fastestModel, bestModel };
}
