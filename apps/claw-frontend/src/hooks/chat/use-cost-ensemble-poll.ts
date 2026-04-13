import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  COST_ENSEMBLE_AUTO_NAVIGATE_DELAY_MS,
  COST_ENSEMBLE_POLL_INTERVAL_MS,
  COST_ENSEMBLE_POLL_MESSAGES_LIMIT,
  MAX_COST_ENSEMBLE_POLL_COUNT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { CostEnsembleMetadata, CostEnsembleResult, UseCostEnsemblePollResult } from '@/types';

export function useCostEnsemblePoll(threadId: string | null): UseCostEnsemblePollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isCostEnsembleError, setIsCostEnsembleError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsCostEnsembleError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_COST_ENSEMBLE_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(
        threadId ?? '',
        1,
        COST_ENSEMBLE_POLL_MESSAGES_LIMIT,
      );
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? COST_ENSEMBLE_POLL_INTERVAL_MS : false,
  });

  const costEnsembleResult = (() => {
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
      return meta?.['costEnsemble'] === true;
    });
    if (!found) {
      return null;
    }
    const state: CostEnsembleResult = {
      content: found.content,
      metadata: found.metadata as CostEnsembleMetadata,
    };
    return state;
  })();

  const isCostEnsembleReady = costEnsembleResult !== null;

  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsCostEnsembleError(true);
      setPollingEnabled(false);
    }
  }, [data]);

  useEffect(() => {
    if (isCostEnsembleReady) {
      setPollingEnabled(false);
      autoNavTimerRef.current = setTimeout(() => {
        if (threadId) {
          router.push(ROUTES.CHAT_THREAD(threadId));
        }
      }, COST_ENSEMBLE_AUTO_NAVIGATE_DELAY_MS);
    }
    return () => {
      if (autoNavTimerRef.current) {
        clearTimeout(autoNavTimerRef.current);
      }
    };
  }, [isCostEnsembleReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    costEnsembleResult,
    isPolling: pollingEnabled,
    isCostEnsembleReady,
    isCostEnsembleError,
    handleViewInThread,
  };
}
