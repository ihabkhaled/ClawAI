import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  CONSENSUS_POLL_INTERVAL_MS,
  CONSENSUS_POLL_MESSAGES_LIMIT,
  MAX_CONSENSUS_POLL_COUNT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { ConsensusMetadata, ConsensusSynthesisState, UseConsensusPollResult } from '@/types';

export function useConsensusPoll(threadId: string | null): UseConsensusPollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isConsensusError, setIsConsensusError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsConsensusError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      // Backstop: a run that fails before writing any error-tagged message
      // (e.g. the whole thread create request itself errors) would otherwise
      // poll forever and keep the submit button disabled forever. Matches
      // the same cap the other 7 orchestration labs already use.
      if (pollCountRef.current >= MAX_CONSENSUS_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(
        threadId ?? '',
        undefined,
        CONSENSUS_POLL_MESSAGES_LIMIT,
      );
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? CONSENSUS_POLL_INTERVAL_MS : false,
  });

  const synthesisMessage = (() => {
    const found = (data?.data ?? []).find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['consensusSynthesis'] === true;
    });
    if (!found) {
      return null;
    }
    const state: ConsensusSynthesisState = {
      content: found.content,
      metadata: found.metadata as ConsensusMetadata,
    };
    return state;
  })();

  const isSynthesisReady = synthesisMessage !== null;

  // Fast path: the backend writes an error-tagged ASSISTANT message when the
  // run fails server-side. Stop polling — and unblock the submit button —
  // the moment that message shows up, instead of waiting for the max-count
  // backstop above.
  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsConsensusError(true);
      setPollingEnabled(false);
    }
  }, [data]);

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
    isConsensusError,
    handleViewInThread,
  };
}
