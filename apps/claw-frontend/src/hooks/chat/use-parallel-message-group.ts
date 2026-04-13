import { useMemo, useState } from 'react';

import { ParallelModelStatus } from '@/enums';
import type { ChatMessage, ParallelExpandedMessage, ParallelModelResponse } from '@/types';
import { getBestResponse } from '@/utilities';

export function useParallelMessageGroup(messages: ChatMessage[]): {
  expanded: ParallelExpandedMessage | null;
  fastestId: string | null;
  bestId: string | null;
  openExpanded: (message: ChatMessage, isFastest: boolean) => void;
  closeExpanded: () => void;
} {
  const [expanded, setExpanded] = useState<ParallelExpandedMessage | null>(null);

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
    const responses: ParallelModelResponse[] = messages.map((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      return {
        provider: m.provider ?? '',
        model: m.model ?? '',
        content: m.content,
        latencyMs: m.latencyMs ?? 0,
        inputTokens: m.inputTokens ?? null,
        outputTokens: m.outputTokens ?? null,
        status: (meta?.['status'] as ParallelModelStatus) ?? ParallelModelStatus.FAILED,
        errorMessage: null,
      };
    });
    const bestModel = getBestResponse(responses);
    if (!bestModel) {
      return null;
    }
    const bestMsg = messages.find((m) => m.model === bestModel);
    return bestMsg?.id ?? null;
  }, [messages]);

  const openExpanded = (message: ChatMessage, isFastest: boolean): void => {
    setExpanded({ message, isFastest });
  };

  const closeExpanded = (): void => {
    setExpanded(null);
  };

  return { expanded, fastestId, bestId, openExpanded, closeExpanded };
}
