import { useState } from 'react';

import type { ChatMessage, ParallelExpandedMessage } from '@/types';

export function useParallelMessageGroup(messages: ChatMessage[]): {
  expanded: ParallelExpandedMessage | null;
  fastestId: string | null;
  openExpanded: (message: ChatMessage, isFastest: boolean) => void;
  closeExpanded: () => void;
} {
  const [expanded, setExpanded] = useState<ParallelExpandedMessage | null>(null);

  const completed = messages.filter(
    (m) => (m.metadata as Record<string, unknown> | null)?.['status'] === 'completed',
  );

  const fastestId =
    completed.length > 0
      ? completed.reduce((prev, curr) =>
          (curr.latencyMs ?? Infinity) < (prev.latencyMs ?? Infinity) ? curr : prev,
        ).id
      : null;

  const openExpanded = (message: ChatMessage, isFastest: boolean): void => {
    setExpanded({ message, isFastest });
  };

  const closeExpanded = (): void => {
    setExpanded(null);
  };

  return { expanded, fastestId, openExpanded, closeExpanded };
}
