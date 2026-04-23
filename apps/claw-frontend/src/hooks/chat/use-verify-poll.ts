import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_VERIFIER_POLL_COUNT,
  ROUTES,
  VERIFIER_POLL_INTERVAL_MS,
  VERIFIER_POLL_MESSAGES_LIMIT,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseVerifyPollResult, UseVerifyResultState, VerifyMetadata } from '@/types';

export function useVerifyPoll(threadId: string | null): UseVerifyPollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isVerifyError, setIsVerifyError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsVerifyError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_VERIFIER_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(threadId ?? '', 1, VERIFIER_POLL_MESSAGES_LIMIT);
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? VERIFIER_POLL_INTERVAL_MS : false,
  });

  const verifyResult = (() => {
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
      return meta?.['verified'] === true;
    });
    if (!found) {
      return null;
    }
    const state: UseVerifyResultState = {
      content: found.content,
      metadata: found.metadata as VerifyMetadata,
    };
    return state;
  })();

  const isVerifyReady = verifyResult !== null;

  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsVerifyError(true);
      setPollingEnabled(false);
    }
  }, [data]);

  useEffect(() => {
    if (isVerifyReady) {
      setPollingEnabled(false);
    }
  }, [isVerifyReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    verifyResult,
    isPolling: pollingEnabled,
    isVerifyReady,
    isVerifyError,
    handleViewInThread,
  };
}
