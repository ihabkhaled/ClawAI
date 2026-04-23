import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_REPAIR_POLL_COUNT,
  REPAIR_POLL_INTERVAL_MS,
  REPAIR_POLL_MESSAGES_LIMIT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { RepairMetadata, RepairResultState, UseRepairPollResult } from '@/types';

export function useRepairPoll(threadId: string | null): UseRepairPollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isRepairError, setIsRepairError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsRepairError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_REPAIR_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(threadId ?? '', 1, REPAIR_POLL_MESSAGES_LIMIT);
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? REPAIR_POLL_INTERVAL_MS : false,
  });

  const repairMessage = (() => {
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
      return meta?.['repaired'] === true;
    });
    if (!found) {
      return null;
    }
    const state: RepairResultState = {
      content: found.content,
      metadata: found.metadata as RepairMetadata,
    };
    return state;
  })();

  const isRepairReady = repairMessage !== null;

  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsRepairError(true);
      setPollingEnabled(false);
    }
  }, [data]);

  useEffect(() => {
    if (isRepairReady) {
      setPollingEnabled(false);
    }
  }, [isRepairReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    repairMessage,
    isPolling: pollingEnabled,
    isRepairReady,
    isRepairError,
    handleViewInThread,
  };
}
