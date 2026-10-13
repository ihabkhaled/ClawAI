import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS,
  THREAD_PROGRESS_MAX_POLLS,
  THREAD_PROGRESS_POLL_INTERVAL_MS,
} from '@/constants/thread-generation-progress.constants';
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
 * The owner's step list for one Thread job. Polls every few seconds while the job
 * runs. A single failed poll does not stop it: polling stops on a terminal status,
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
        current.state.dataUpdateCount >= THREAD_PROGRESS_MAX_POLLS
      ) {
        return false;
      }
      return THREAD_PROGRESS_POLL_INTERVAL_MS;
    },
  });
  const state = queryClient.getQueryState(queryKey);
  const updateCount = state?.dataUpdateCount ?? 0;
  const status = query.data?.status;
  const settled = status !== undefined && isTerminalThreadStatus(status);
  const pausedByErrors =
    !settled &&
    !isThreadPollFatalError(query.error) &&
    failures.current.count >= THREAD_PROGRESS_MAX_CONSECUTIVE_ERRORS;
  const pausedByBudget =
    status !== undefined && !settled && updateCount >= THREAD_PROGRESS_MAX_POLLS;

  return {
    progress: query.data,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    error: query.isError ? resolveThreadErrorMessage(query.error) : null,
    pollingPaused: pausedByErrors || pausedByBudget,
    pollingPausedByErrors: pausedByErrors,
  };
}
