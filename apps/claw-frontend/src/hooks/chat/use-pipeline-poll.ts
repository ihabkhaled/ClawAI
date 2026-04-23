import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  MAX_PIPELINE_POLL_COUNT,
  PIPELINE_POLL_INTERVAL_MS,
  PIPELINE_POLL_MESSAGES_LIMIT,
  ROUTES,
} from '@/constants';
import { chatRepository } from '@/repositories/chat/chat.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { PipelineMetadata, PipelineResult, UsePipelinePollResult } from '@/types';

export function usePipelinePoll(threadId: string | null): UsePipelinePollResult {
  const router = useRouter();
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [isPipelineError, setIsPipelineError] = useState(false);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    pollCountRef.current = 0;
    setIsPipelineError(false);
    setPollingEnabled(!!threadId);
  }, [threadId]);

  const { data } = useQuery({
    queryKey: queryKeys.threads.messages(threadId ?? '', 1),
    queryFn: () => {
      pollCountRef.current += 1;
      if (pollCountRef.current >= MAX_PIPELINE_POLL_COUNT) {
        setPollingEnabled(false);
      }
      return chatRepository.getMessagesPaginated(threadId ?? '', 1, PIPELINE_POLL_MESSAGES_LIMIT);
    },
    enabled: pollingEnabled,
    refetchInterval: pollingEnabled ? PIPELINE_POLL_INTERVAL_MS : false,
  });

  const pipelineResult = (() => {
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
      return meta?.['pipeline'] === true;
    });
    if (!found) {
      return null;
    }
    const result: PipelineResult = {
      content: found.content,
      metadata: found.metadata as PipelineMetadata,
    };
    return result;
  })();

  const isPipelineReady = pipelineResult !== null;

  useEffect(() => {
    const messages = data?.data ?? [];
    const errorMsg = messages.find((msg) => {
      const meta = msg.metadata as Record<string, unknown> | null;
      return meta?.['error'] === true;
    });
    if (errorMsg) {
      setIsPipelineError(true);
      setPollingEnabled(false);
    }
  }, [data]);

  useEffect(() => {
    if (isPipelineReady) {
      setPollingEnabled(false);
    }
  }, [isPipelineReady, threadId, router]);

  const handleViewInThread = useCallback((): void => {
    if (autoNavTimerRef.current) {
      clearTimeout(autoNavTimerRef.current);
    }
    if (threadId) {
      router.push(ROUTES.CHAT_THREAD(threadId));
    }
  }, [threadId, router]);

  return {
    pipelineResult,
    isPolling: pollingEnabled,
    isPipelineReady,
    isPipelineError,
    handleViewInThread,
  };
}
