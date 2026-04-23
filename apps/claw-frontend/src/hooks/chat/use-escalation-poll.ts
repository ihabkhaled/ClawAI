import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ESCALATION_POLL_INTERVAL_MS,
  ESCALATION_POLL_MESSAGES_LIMIT,
  MAX_ESCALATION_POLL_COUNT,
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
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_ESCALATION_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(threadId ?? '', 1, ESCALATION_POLL_MESSAGES_LIMIT);
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? ESCALATION_POLL_INTERVAL_MS : false,
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
    }
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
