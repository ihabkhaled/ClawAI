import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  BEST_OF_N_POLL_INTERVAL_MS,
  BEST_OF_N_POLL_MESSAGES_LIMIT,
  MAX_BEST_OF_N_POLL_COUNT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { BestOfNMetadata, BestOfNResultState, UseBestOfNPollResult } from '@/types';

export function useBestOfNPoll(threadId: string | null): UseBestOfNPollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isBestOfNError, setIsBestOfNError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsBestOfNError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_BEST_OF_N_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(threadId ?? '', 1, BEST_OF_N_POLL_MESSAGES_LIMIT);
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? BEST_OF_N_POLL_INTERVAL_MS : false,
  });

  const bestOfNResult = (() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      return null;
    }
    const found = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['bestOfN'] === true;
    });
    if (!found) {
      return null;
    }
    const state: BestOfNResultState = {
      content: found.content,
      metadata: found.metadata as BestOfNMetadata,
    };
    return state;
  })();

  const isBestOfNReady = bestOfNResult !== null;

  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsBestOfNError(true);
      setPollingEnabled(false);
    }
  }, [data]);

  useEffect(() => {
    if (isBestOfNReady) {
      setPollingEnabled(false);
    }
  }, [isBestOfNReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    bestOfNResult,
    isPolling: pollingEnabled,
    isBestOfNReady,
    isBestOfNError,
    handleViewInThread,
  };
}
