import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import {
  THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS,
  THREAD_PROGRESS_MAX_POLLS,
  THREAD_PROGRESS_POLL_INTERVAL_MS,
} from '@/constants/thread-generation-progress.constants';
import { ThreadProgressStreamMode } from '@/enums/thread-progress-stream.enum';
import { useThreadProgressStream } from '@/hooks/threads/use-thread-progress-stream';
import { threadPublicationsRepository } from '@/repositories/threads/thread-publications.repository';
import type { UseThreadGenerationProgressResult } from '@/types/thread-generation-progress.types';
import {
  isThreadPollFatalError,
  resolveThreadErrorMessage,
} from '@/utilities/thread-error-message.utility';
import { isTerminalThreadStatus } from '@/utilities/thread-generation-progress.utility';

export function threadProgressQueryKey(publicationId: string): readonly string[] {
  return ['thread-publications', publicationId, 'generation-progress'];
}

/**
 * The owner's step list for one Thread job. It is pushed over a Server-Sent Events stream
 * (ADR-201) into this same cache entry; while the stream is not live (connecting, failed, or a
 * browser that cannot stream) it polls every few seconds exactly as before. A single failed poll does not stop it: polling stops on a terminal status,
 * on 404/403 (the Thread is gone or not the viewer's), after a run of consecutive
 * errors, and after a hard poll budget, so a stuck job can never keep a tab
 * hammering the service.
 */
export function useThreadGenerationProgress(
  publicationId: string,
): UseThreadGenerationProgressResult {
  const queryClient = useQueryClient();
  const queryKey = threadProgressQueryKey(publicationId);
  // React Query resets its own failure count on every refetch, so consecutive failures are counted here.
  const failures = useRef({ publicationId, count: 0 });
  if (failures.current.publicationId !== publicationId) {
    failures.current = { publicationId, count: 0 };
  }
  // Snapshots the stream wrote into the cache count as updates but not as polls, so they never spend the poll budget.
  const streamed = useRef({ publicationId, count: 0 });
  if (streamed.current.publicationId !== publicationId) {
    streamed.current = { publicationId, count: 0 };
  }
  const [streamMode, setStreamMode] = useState<ThreadProgressStreamMode>(
    ThreadProgressStreamMode.Connecting,
  );
  const countStreamed = useCallback((): void => {
    streamed.current.count += 1;
    // Data is arriving, so earlier failed polls no longer mean the panel is stuck.
    failures.current.count = 0;
  }, []);
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const progress = await threadPublicationsRepository.getGenerationProgress(publicationId);
        failures.current.count = 0;
        return progress;
      } catch (error: unknown) {
        failures.current.count += 1;
        throw error;
      }
    },
    enabled: publicationId !== '',
    retry: false,
    refetchInterval: (current) => {
      const status = current.state.data?.status;
      if (
        isThreadPollFatalError(current.state.error) ||
        failures.current.count >= THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS ||
        (status !== undefined && isTerminalThreadStatus(status)) ||
        current.state.dataUpdateCount - streamed.current.count >= THREAD_PROGRESS_MAX_POLLS ||
        streamMode === ThreadProgressStreamMode.Live
      ) {
        return false;
      }
      return THREAD_PROGRESS_POLL_INTERVAL_MS;
    },
  });
  const state = queryClient.getQueryState(queryKey);
  const updateCount = (state?.dataUpdateCount ?? 0) - streamed.current.count;
  const status = query.data?.status;
  const settled = status !== undefined && isTerminalThreadStatus(status);
  useThreadProgressStream({
    publicationId,
    queryKey,
    queryClient,
    enabled: publicationId !== '' && !settled && !isThreadPollFatalError(query.error),
    onMode: setStreamMode,
    onApplied: countStreamed,
  });
  const pausedByErrors =
    !settled &&
    !isThreadPollFatalError(query.error) &&
    failures.current.count >= THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS;
  const pausedByBudget =
    status !== undefined &&
    !settled &&
    streamMode !== ThreadProgressStreamMode.Live &&
    updateCount >= THREAD_PROGRESS_MAX_POLLS;

  return {
    progress: query.data,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    error: query.isError ? resolveThreadErrorMessage(query.error) : null,
    pollingPaused: pausedByErrors || pausedByBudget,
    pollingPausedByErrors: pausedByErrors,
  };
}
