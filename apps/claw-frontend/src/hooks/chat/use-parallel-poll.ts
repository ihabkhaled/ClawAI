import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_PARALLEL_POLL_COUNT,
  PARALLEL_POLL_INTERVAL_MS,
  PARALLEL_POLL_MESSAGES_LIMIT,
  ROUTES,
} from '@/constants';
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
  isParallelError: boolean;
  handleViewInThread: () => void;
} {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isParallelError, setIsParallelError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsParallelError(false);
    setPollingEnabled(!!threadId && expectedModelCount > 0);
  }, [threadId, expectedModelCount]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      // Backstop: a compare run where every lane fails before writing any
      // parallelExecution-tagged message never reaches `expectedModelCount`
      // and would otherwise poll forever, leaving the submit button
      // disabled forever. Matches the cap the other orchestration labs use.
      if (pollCountRef.current >= MAX_PARALLEL_POLL_COUNT) {
        setPollingEnabled(false);
        setIsParallelError(true);
      }
      return chatRepository.getMessagesPaginated(
        threadId ?? '',
        undefined,
        PARALLEL_POLL_MESSAGES_LIMIT,
      );
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? PARALLEL_POLL_INTERVAL_MS : false,
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
    isParallelError,
    handleViewInThread,
  };
}
