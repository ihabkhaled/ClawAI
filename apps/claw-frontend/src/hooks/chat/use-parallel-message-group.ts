import { useMemo, useState } from 'react';

import { ParallelModelStatus } from '@/enums';
import type { ChatMessage, ParallelExpandedMessage, ParallelModelResponse } from '@/types';
import { getBestResponse, messageToParallelResponse } from '@/utilities';

export function useParallelMessageGroup(messages: ChatMessage[]): {
  responses: ParallelModelResponse[];
  expanded: ParallelExpandedMessage | null;
  fastestId: string | null;
  bestId: string | null;
  openExpanded: (message: ChatMessage, isFastest: boolean) => void;
  closeExpanded: () => void;
} {
  const [expanded, setExpanded] = useState<ParallelExpandedMessage | null>(null);
  const responses = useMemo(
    () => messages.map((message) => messageToParallelResponse(message)),
    [messages],
  );

  const completed = messages.filter(
    (m) =>
      (m.metadata as Record<string, unknown> | null)?.['status'] === ParallelModelStatus.COMPLETED,
  );

  const fastestId =
    completed.length > 0
      ? completed.reduce((prev, curr) =>
          (curr.latencyMs ?? Infinity) < (prev.latencyMs ?? Infinity) ? curr : prev,
        ).id
      : null;

  const bestId = useMemo(() => {
    const bestModel = getBestResponse(responses);
    if (!bestModel) {
      return null;
    }
    const bestMsg = messages.find((m) => m.model === bestModel);
    return bestMsg?.id ?? null;
  }, [messages, responses]);

  const openExpanded = (message: ChatMessage, isFastest: boolean): void => {
    setExpanded({ message, isFastest });
  };

  const closeExpanded = (): void => {
    setExpanded(null);
  };

  return { responses, expanded, fastestId, bestId, openExpanded, closeExpanded };
}
