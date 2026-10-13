import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import {
  THREAD_STEP_OUTCOME_KEYS,
  THREAD_STEP_OUTCOME_TONES,
} from '@/constants/thread-generation-progress.constants';
import { THREAD_STEP_OUTCOME_ICONS } from '@/constants/thread-step-icons.constants';
import { useThreadStepExcerpt } from '@/hooks/threads/use-thread-step-excerpt';
import { useTranslation } from '@/lib/i18n';
import type { ThreadStepItemProps } from '@/types/thread-generation-progress.types';
import {
  describeStepDuration,
  formatStepTime,
  resolveThreadFailureKeys,
  threadRoleLabelKey,
  truncateExcerpt,
} from '@/utilities/thread-generation-progress.utility';
import { threadStageLabelKey } from '@/utilities/thread-generation-stage.utility';

/** One step of the job: who did what, how it ended, why, how long, and what the AI said. */
export function ThreadGenerationStepItem({ step }: ThreadStepItemProps): ReactElement {
  const { t } = useTranslation();
  const excerpt = useThreadStepExcerpt();
  const Icon = THREAD_STEP_OUTCOME_ICONS[step.outcome];
  const stageKey = threadStageLabelKey(step.stage);
  const failure = step.code === null ? null : resolveThreadFailureKeys(step.code);
  const duration = step.durationMs === null ? null : describeStepDuration(step.durationMs);
  const model = [step.provider, step.model].filter(Boolean).join(' / ');

  return (
    <li
      className="border-border flex min-w-0 flex-col gap-1 border-s-2 ps-3"
      data-testid="thread-progress-step"
      data-outcome={step.outcome}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span
          className={`inline-flex items-center gap-1 font-medium ${THREAD_STEP_OUTCOME_TONES[step.outcome]}`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t(THREAD_STEP_OUTCOME_KEYS[step.outcome])}
        </span>
        <span>{t(threadRoleLabelKey(step.roleKind))}</span>
        {model === '' ? null : (
          <span className="text-muted-foreground min-w-0 break-all">{model}</span>
        )}
        <span className="text-muted-foreground ms-auto text-xs">{formatStepTime(step.at)}</span>
      </div>
      <p className="text-muted-foreground text-xs">
        {stageKey === null ? step.stage : t(stageKey)}
        {step.round > 0 ? ` · ${t('chat.threadStageRound', { round: String(step.round) })}` : ''}
      </p>
      {failure === null ? null : (
        <p
          className={`text-sm ${THREAD_STEP_OUTCOME_TONES[step.outcome]}`}
          data-testid="thread-progress-step-code"
        >
          {t(failure.messageKey, failure.params)}
          {step.httpStatus === null || step.outcome !== 'FAILED'
            ? ''
            : ` (${t('chat.threadProgress.httpStatus', { status: String(step.httpStatus) })})`}
        </p>
      )}
      <p className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
        {duration === null ? null : (
          <span>
            {t('chat.threadProgress.duration', { time: t(duration.key, duration.params) })}
          </span>
        )}
        {step.inputTokens === null && step.outputTokens === null ? null : (
          <span>
            {t('chat.threadProgress.tokens', {
              input: String(step.inputTokens ?? 0),
              output: String(step.outputTokens ?? 0),
            })}
          </span>
        )}
      </p>
      {step.excerpt === null || step.excerpt === '' ? null : (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit px-0"
            aria-expanded={excerpt.isOpen}
            onClick={excerpt.toggle}
          >
            {excerpt.isOpen
              ? t('chat.threadProgress.hideExcerpt')
              : t('chat.threadProgress.showExcerpt')}
          </Button>
          {excerpt.isOpen ? (
            <pre
              className="bg-muted/30 rounded-md p-3 text-xs break-words whitespace-pre-wrap"
              data-testid="thread-progress-excerpt"
            >
              {truncateExcerpt(step.excerpt)}
            </pre>
          ) : null}
        </>
      )}
    </li>
  );
}
