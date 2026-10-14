import { useThreadDeleteAction } from '@/hooks/threads/use-thread-delete-action';
import { useThreadGenerationProgress } from '@/hooks/threads/use-thread-generation-progress';
import { useThreadRecoveryActions } from '@/hooks/threads/use-thread-recovery-actions';
import { useThreadRetryForm } from '@/hooks/threads/use-thread-retry-form';
import type { ThreadProgressPanelController } from '@/types/thread-generation-progress.types';
import {
  isRetryableThreadStatus,
  isTerminalThreadStatus,
} from '@/utilities/thread-generation-progress.utility';

/** Everything the owner progress panel needs, in one controller. */
export function useThreadProgressPanel(publicationId: string): ThreadProgressPanelController {
  const { progress, isLoading, error, pollingPaused, pollingPausedByErrors } =
    useThreadGenerationProgress(publicationId);
  const retry = useThreadRetryForm(publicationId, progress);
  const recovery = useThreadRecoveryActions(publicationId, progress, retry);
  const remove = useThreadDeleteAction(publicationId);

  return {
    progress,
    isLoading,
    error,
    pollingPaused,
    pollingPausedByErrors,
    isRunning: progress !== undefined && !isTerminalThreadStatus(progress.status),
    canRetry:
      progress !== undefined &&
      isRetryableThreadStatus(progress.status) &&
      progress.failure?.retryable !== false,
    retry,
    recovery,
    remove,
  };
}
