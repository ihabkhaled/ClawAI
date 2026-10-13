import type { ReactElement } from 'react';

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
}: ThreadFailureCardProps): ReactElement {
  const { t } = useTranslation();
  const keys = resolveThreadFailureKeys(failure.code);
  const stageKey = threadStageLabelKey(failure.failedStage);
  const stage = stageKey === null ? failure.failedStage : t(stageKey);

  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/10 flex min-w-0 flex-col gap-2 rounded-md border p-4 text-sm"
      data-testid="thread-progress-failure"
    >
      <h3 className="text-destructive font-semibold">{t('chat.threadProgress.failureTitle')}</h3>
      <p>
        {roleKind === null
          ? t('chat.threadProgress.failureWhereNoRole', { stage })
          : t('chat.threadProgress.failureWhere', { stage, role: t(threadRoleLabelKey(roleKind)) })}
      </p>
      <p className="font-medium">{t(keys.messageKey, keys.params)}</p>
      <p className="text-muted-foreground text-xs">
        {t('chat.threadProgress.errorCode', { code: failure.code })}
        {failure.httpStatus === null
          ? ''
          : ` · ${t('chat.threadProgress.httpStatus', { status: String(failure.httpStatus) })}`}
      </p>
      <div>
        <p className="font-medium">{t('chat.threadProgress.failureHintLabel')}</p>
        <p>{t(keys.hintKey, keys.params)}</p>
        <p className="text-muted-foreground">
          {failure.retryable
            ? t('chat.threadProgress.failureRetryable')
            : t('chat.threadProgress.failureNotRetryable')}
        </p>
      </div>
    </div>
  );
}
