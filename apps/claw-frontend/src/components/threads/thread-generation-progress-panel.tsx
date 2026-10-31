import { RotateCcw, Square, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadErrorNotice } from '@/components/threads/thread-error-notice';
import { ThreadGenerationDeleteDialog } from '@/components/threads/thread-generation-delete-dialog';
import { ThreadGenerationFailureCard } from '@/components/threads/thread-generation-failure-card';
import { ThreadGenerationHealingNotice } from '@/components/threads/thread-generation-healing-notice';
import { ThreadGenerationRecoveryPanel } from '@/components/threads/thread-generation-recovery-panel';
import { ThreadGenerationRetryForm } from '@/components/threads/thread-generation-retry-form';
import { ThreadGenerationSelectionsView } from '@/components/threads/thread-generation-selections';
import { ThreadGenerationTimeline } from '@/components/threads/thread-generation-timeline';
import { Button } from '@/components/ui/button';
import { useThreadFollowBottom } from '@/hooks/threads/use-thread-follow-bottom';
import { useThreadProgressPanel } from '@/hooks/threads/use-thread-progress-panel';
import { useTranslation } from '@/lib/i18n';
import type { ThreadProgressPanelProps } from '@/types/thread-generation-progress.types';
import {
  describeIncludedUsage,
  findFailedRoleKind,
  formatMicroUsd,
  hasThreadSpend,
  describeThreadQueue,
  isQueuedThreadStatus,
  readAllowanceRefunded,
  readThreadSpentMicro,
  threadHeadlineKey,
  threadProgressSignature,
} from '@/utilities/thread-generation-progress.utility';

/**
 * The owner's full view of one Thread job: status, what they selected, every step
 * with its outcome and the AI's own words, the failure in plain language, and the
 * retry, cancel and delete actions. The service answers 404 to everyone else.
 */
export function ThreadGenerationProgressPanel({
  publicationId,
  canDelete,
  onCancel,
  isCancelling,
}: ThreadProgressPanelProps): ReactElement {
  const { t } = useTranslation();
  const panel = useThreadProgressPanel(publicationId);
  const { progress } = panel;
  const headlineKey = progress ? threadHeadlineKey(progress.status, progress.stage) : null;
  const allowanceRefunded = progress !== undefined && readAllowanceRefunded(progress);
  const spentMicro = progress === undefined ? '0' : readThreadSpentMicro(progress);
  const included = progress === undefined ? null : describeIncludedUsage(progress);
  const isQueued = progress !== undefined && isQueuedThreadStatus(progress.status);
  const queueLine = describeThreadQueue(progress?.queue);
  const endRef = useThreadFollowBottom(threadProgressSignature(progress), panel.isRunning);

  return (
    <section
      className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-lg border p-4 sm:p-5"
      aria-live="polite"
      data-testid="thread-progress-panel"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">{t('chat.threadProgress.title')}</h2>
        <p className="text-muted-foreground text-xs">{t('chat.threadProgress.ownerOnlyNote')}</p>
      </div>
      {panel.isLoading ? <p role="status">{t('common.loading')}</p> : null}
      {panel.error === null ? null : <ThreadErrorNotice message={panel.error} />}
      {panel.pollingPaused ? (
        <p
          role="status"
          className="dark:text-warning text-sm text-amber-700"
          data-testid="thread-progress-paused"
        >
          {t(
            panel.pollingPausedByErrors
              ? 'chat.threadProgress.pollingErrors'
              : 'chat.threadProgress.pollingPaused',
          )}
        </p>
      ) : null}
      {progress ? (
        <>
          <p
            className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-sm"
            data-testid="thread-progress-summary"
          >
            <span className="text-foreground font-medium">
              {headlineKey === null ? progress.stage : t(headlineKey)}
            </span>
            {progress.round > 0 ? (
              <span>{t('chat.threadStageRound', { round: String(progress.round) })}</span>
            ) : null}
            {isQueued ? null : (
              <span>
                {t('chat.threadProgress.attempt', {
                  current: String(progress.attemptCount),
                  max: String(progress.maxAttempts),
                })}
              </span>
            )}
            {hasThreadSpend(spentMicro) ? (
              <span data-testid="thread-progress-spent">
                {t('chat.threadProgress.spent', {
                  amount: formatMicroUsd(spentMicro),
                })}
              </span>
            ) : null}
            {!hasThreadSpend(spentMicro) && included !== null ? (
              <span data-testid="thread-progress-included">{t(included.key, included.params)}</span>
            ) : null}
          </p>
          {isQueued ? (
            <p
              role="status"
              className="text-muted-foreground text-sm"
              data-testid="thread-progress-queued"
            >
              {t('chat.threadProgress.queuedHint')}
            </p>
          ) : null}
          {isQueued && queueLine !== null ? (
            <p
              role="status"
              className="text-sm font-medium"
              data-testid="thread-progress-queue-position"
            >
              {t(queueLine.key, queueLine.params)}
            </p>
          ) : null}
          {panel.isRunning && !isQueued && progress.failure === null ? (
            <p
              role="status"
              className="text-muted-foreground text-sm"
              data-testid="thread-progress-still-working"
            >
              {t('chat.threadProgress.stillWorking')}
            </p>
          ) : null}
          {progress.healing && panel.isRunning ? (
            <ThreadGenerationHealingNotice healing={progress.healing} />
          ) : null}
          {progress.failure === null ? null : (
            <>
              <ThreadGenerationFailureCard
                failure={progress.failure}
                roleKind={findFailedRoleKind(progress)}
                allowanceRefunded={allowanceRefunded}
              />
              <ThreadGenerationRecoveryPanel
                failure={progress.failure}
                healing={progress.healing}
                recovery={panel.recovery}
              />
            </>
          )}
          <ThreadGenerationSelectionsView selections={progress.selections} />
          <ThreadGenerationTimeline steps={progress.steps} />
          <div className="border-border flex flex-col gap-2 border-t pt-4 sm:flex-row sm:flex-wrap">
            {panel.canRetry ? (
              <Button type="button" onClick={panel.retry.open} className="w-full sm:w-auto">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t(
                  allowanceRefunded ? 'chat.threadProgress.retryOnUs' : 'chat.threadProgress.retry',
                )}
              </Button>
            ) : null}
            {panel.isRunning ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isCancelling}
                isLoading={isCancelling}
                className="w-full sm:w-auto"
              >
                <Square className="h-4 w-4" aria-hidden="true" />
                {t('common.cancel')}
              </Button>
            ) : null}
            {canDelete && !panel.isRunning ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => panel.remove.setOpen(true)}
                className="w-full sm:ms-auto sm:w-auto"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('chat.threadProgress.deleteButton')}
              </Button>
            ) : null}
          </div>
          <ThreadGenerationRetryForm form={panel.retry} />
          <ThreadGenerationDeleteDialog remove={panel.remove} />
        </>
      ) : null}
      <div ref={endRef} aria-hidden="true" data-testid="thread-progress-end" />
    </section>
  );
}
