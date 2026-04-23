import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { PARALLEL_POLL_INTERVAL_MS, PARALLEL_POLL_MESSAGES_LIMIT, ROUTES } from '@/constants';
import { MessageRole } from '@/enums';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ChatMessage } from '@/types';

export function useParallelPoll(
  threadId: string | null,
  expectedModelCount: number,
): {
  pollingMessages: ChatMessage[];
  isPolling: boolean;
  allResponded: boolean;
  handleViewInThread: () => void;
} {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPollingEnabled(!!threadId && expectedModelCount > 0);
  }, [threadId, expectedModelCount]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () =>
      chatRepository.getMessagesPaginated(threadId ?? '', 1, PARALLEL_POLL_MESSAGES_LIMIT),
    enabled: pollingEnabled,
    refetchInterval: PARALLEL_POLL_INTERVAL_MS,
  });

  const pollingMessages = (data?.data ?? []).filter((msg) => {
    const meta = msg.metadata as Record<string, unknown> | null;
    return msg.role === MessageRole.ASSISTANT && meta?.['parallelExecution'] === true;
  });

  const allResponded = pollingMessages.length >= expectedModelCount && expectedModelCount > 0;

  useEffect(() => {
    if (allResponded) {
      setPollingEnabled(false);
    }
  }, [allResponded, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    pollingMessages,
    isPolling: pollingEnabled,
    allResponded,
    handleViewInThread,
  };
}
