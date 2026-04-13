import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ESCALATION_AUTO_NAVIGATE_DELAY_MS,
  ESCALATION_POLL_INTERVAL_MS,
  ESCALATION_POLL_MESSAGES_LIMIT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  EscalationChainMetadata,
  EscalationChainSynthesisState,
  UseEscalationPollResult,
} from '@/types';

export function useEscalationPoll(threadId: string | null): UseEscalationPollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () =>
      chatRepository.getMessagesPaginated(threadId ?? '', 1, ESCALATION_POLL_MESSAGES_LIMIT),
    enabled: pollingEnabled,
    refetchInterval: ESCALATION_POLL_INTERVAL_MS,
  });

  const synthesisMessage = (() => {
    const found = (data?.data ?? []).find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['escalationChain'] === true;
    });
    if (!found) {
      return null;
    }
    const state: EscalationChainSynthesisState = {
      content: found.content,
      metadata: found.metadata as EscalationChainMetadata,
    };
    return state;
  })();

  const isSynthesisReady = synthesisMessage !== null;

  useEffect(() => {
    if (isSynthesisReady) {
      setPollingEnabled(false);
      autoNavTimerRef.current = setTimeout(() => {
        if (threadId) {
          router.push(ROUTES.CHAT_THREAD(threadId));
        }
      }, ESCALATION_AUTO_NAVIGATE_DELAY_MS);
    }
    return () => {
      if (autoNavTimerRef.current) {
        clearTimeout(autoNavTimerRef.current);
      }
    };
  }, [isSynthesisReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    synthesisMessage,
    isPolling: pollingEnabled,
    isSynthesisReady,
    handleViewInThread,
  };
}
