import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DECOMPOSE_AUTO_NAVIGATE_DELAY_MS,
  DECOMPOSE_POLL_INTERVAL_MS,
  DECOMPOSE_POLL_MESSAGES_LIMIT,
  MAX_DECOMPOSE_POLL_COUNT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  DecompositionMetadata,
  DecompositionResultState,
  UseDecomposePollResult,
} from '@/types';

export function useDecomposePoll(threadId: string | null): UseDecomposePollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isDecompositionError, setIsDecompositionError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsDecompositionError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_DECOMPOSE_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(threadId ?? '', 1, DECOMPOSE_POLL_MESSAGES_LIMIT);
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? DECOMPOSE_POLL_INTERVAL_MS : false,
  });

  const decompositionResult = (() => {
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
      return meta?.['decomposed'] === true;
    });
    if (!found) {
      return null;
    }
    const state: DecompositionResultState = {
      content: found.content,
      metadata: found.metadata as DecompositionMetadata,
    };
    return state;
  })();

  const isDecompositionReady = decompositionResult !== null;

  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsDecompositionError(true);
      setPollingEnabled(false);
    }
  }, [data]);

  useEffect(() => {
    if (isDecompositionReady) {
      setPollingEnabled(false);
      autoNavTimerRef.current = setTimeout(() => {
        if (threadId) {
          router.push(ROUTES.CHAT_THREAD(threadId));
        }
      }, DECOMPOSE_AUTO_NAVIGATE_DELAY_MS);
    }
    return () => {
      if (autoNavTimerRef.current) {
        clearTimeout(autoNavTimerRef.current);
      }
    };
  }, [isDecompositionReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    decompositionResult,
    isPolling: pollingEnabled,
    isDecompositionReady,
    isDecompositionError,
    handleViewInThread,
  };
}
