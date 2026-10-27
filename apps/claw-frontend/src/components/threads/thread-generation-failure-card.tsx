import { TriangleAlert } from 'lucide-react';
import type { ReactElement } from 'react';

import { ThreadReviewVerdictView } from '@/components/threads/thread-review-verdict-view';
import { useTranslation } from '@/lib/i18n';
import type { ThreadFailureCardProps } from '@/types/thread-generation-progress.types';
import {
  resolveThreadFailureKeys,
  threadRoleLabelKey,
} from '@/utilities/thread-generation-progress.utility';
import { threadStageLabelKey } from '@/utilities/thread-generation-stage.utility';

/** Why the job stopped: the failed stage and role, the reason in words, and what to do next. */
export function ThreadGenerationFailureCard({
  failure,
  roleKind,
  allowanceRefunded = false,
}: ThreadFailureCardProps): ReactElement {
  const { t } = useTranslation();
  const keys = resolveThreadFailureKeys(failure.code);
  const review = failure.review;
  const stageKey = threadStageLabelKey(failure.failedStage);
  const stage = stageKey === null ? failure.failedStage : t(stageKey);

  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/10 flex min-w-0 flex-col gap-2 rounded-md border p-4 text-sm"
      data-testid="thread-progress-failure"
    >
      <h3 className="dark:text-destructive flex items-center gap-2 font-semibold text-red-800">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('chat.threadProgress.failureTitle')}
      </h3>
      <p>
        {roleKind === null
          ? t('chat.threadProgress.failureWhereNoRole', { stage })
          : t('chat.threadProgress.failureWhere', { stage, role: t(threadRoleLabelKey(roleKind)) })}
      </p>
      <p className="font-medium">
        {review?.blocked === true
          ? t('chat.threadEvidenceBlockedTitle')
          : t(keys.messageKey, keys.params)}
      </p>
      {review === undefined || review === null ? null : (
        <ThreadReviewVerdictView
          verdict={review}
          reviewerLabel={t(threadRoleLabelKey(review.reviewer))}
        />
      )}
      {allowanceRefunded ? (
        <p className="font-medium" data-testid="thread-progress-platform-failure">
          {t('chat.threadProgress.platformFailureNotice')}
        </p>
      ) : null}
      <details className="text-xs" data-testid="thread-progress-failure-details">
        <summary className="cursor-pointer font-medium">
          {t('chat.threadProgress.detailsLabel')}
        </summary>
        <p className="mt-1 break-all" dir="ltr">
          {t('chat.threadProgress.errorCode', { code: failure.code })}
          {failure.httpStatus === null
            ? ''
            : ` · ${t('chat.threadProgress.httpStatus', { status: String(failure.httpStatus) })}`}
        </p>
      </details>
      <div>
        <p className="font-medium">{t('chat.threadProgress.failureHintLabel')}</p>
        <p>{t(keys.hintKey, keys.params)}</p>
        <p>
          {failure.retryable
            ? t('chat.threadProgress.failureRetryable')
            : t('chat.threadProgress.failureNotRetryable')}
        </p>
      </div>
    </div>
  );
}
