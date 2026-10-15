import type { ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { THREAD_FORMAT_SKIP_TONE } from '@/constants/thread-format.constants';
import {
  THREAD_STEP_OUTCOME_KEYS,
  THREAD_STEP_OUTCOME_TONES,
} from '@/constants/thread-generation-progress.constants';
import { THREAD_HEALING_STEP_CODES } from '@/constants/thread-recovery.constants';
import { THREAD_STEP_OUTCOME_ICONS } from '@/constants/thread-step-icons.constants';
import { useThreadStepExcerpt } from '@/hooks/threads/use-thread-step-excerpt';
import { useTranslation } from '@/lib/i18n';
import type { ThreadStepItemProps } from '@/types/thread-generation-progress.types';
import { isThreadFormatSkipCode } from '@/utilities/thread-format-message.utility';
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
  // A formatting skip is a safe, expected outcome: neutral information, not an error.
  const isFormatSkip = step.outcome === 'SKIPPED' && isThreadFormatSkipCode(step.code);
  const codeTone = isFormatSkip ? THREAD_FORMAT_SKIP_TONE : THREAD_STEP_OUTCOME_TONES[step.outcome];
  const duration = step.durationMs === null ? null : describeStepDuration(step.durationMs);
  const model = [step.provider, step.model].filter(Boolean).join(' / ');
  // A healing step's excerpt is only the failure class it answered, not something the AI said.
  const isHealingStep = step.code !== null && THREAD_HEALING_STEP_CODES.has(step.code);

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
          className={`text-sm ${codeTone}`}
          data-testid="thread-progress-step-code"
          data-kind={isFormatSkip ? 'info' : undefined}
          role={isFormatSkip ? 'status' : undefined}
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
      {step.excerpt === null || step.excerpt === '' || isHealingStep ? null : (
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
