import { AlertTriangle, ArrowRight, RefreshCw, XCircle } from 'lucide-react';

import { THINKING_INDICATOR_LABEL } from '@/constants';
import { FallbackFailureType, VisibleProgressStageStatus } from '@/enums';
import { cn } from '@/lib/utils';
import type { ThinkingIndicatorProps } from '@/types';

export function ThinkingIndicator({
  className,
  fallbackAttempts,
  streamError,
  judgeEvaluating,
  executingModel,
  judgeModel,
  progressStages,
  currentStageLabel,
}: ThinkingIndicatorProps) {
  const hasFallbacks = fallbackAttempts && fallbackAttempts.length > 0;
  const recentStages = progressStages?.slice(-4) ?? [];

  let statusLabel: string;
  if (judgeEvaluating) {
    statusLabel = `Verifying with ${judgeModel ?? 'judge'}...`;
  } else if (currentStageLabel) {
    statusLabel = currentStageLabel;
  } else if (hasFallbacks) {
    statusLabel = 'Retrying with fallback...';
  } else if (executingModel) {
    statusLabel = `${executingModel} is thinking...`;
  } else {
    statusLabel = THINKING_INDICATOR_LABEL;
  }

  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="flex max-w-[85%] flex-col items-start gap-1.5">
        {hasFallbacks ? (
          <div className="flex flex-col gap-1">
            {fallbackAttempts.map((attempt, idx) => (
              <div
                key={`${attempt.failedProvider}-${String(attempt.attempt)}-${String(idx)}`}
                className={cn(
                  'flex items-center gap-1.5 text-xs',
                  attempt.failureType === FallbackFailureType.QUALITY
                    ? 'text-blue-500'
                    : 'text-amber-500',
                )}
              >
                {attempt.failureType === FallbackFailureType.QUALITY ? (
                  <RefreshCw className="h-3 w-3 shrink-0" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                )}
                <span>
                  {attempt.failedProvider}/{attempt.failedModel}{' '}
                  {attempt.failureType === FallbackFailureType.QUALITY ? 'weak response' : 'failed'}
                </span>
                {attempt.nextProvider ? (
                  <>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>
                      trying {attempt.nextProvider}/{attempt.nextModel}...
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {streamError ? (
          <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{streamError}</span>
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
            {recentStages.length > 0 ? (
              <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                {recentStages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-start justify-between gap-3 text-xs text-muted-foreground"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">{stage.label}</div>
                      {stage.description ? (
                        <div className="truncate text-muted-foreground">{stage.description}</div>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
                        {
                          'bg-destructive/10 text-destructive':
                            stage.status === VisibleProgressStageStatus.ERROR,
                          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400':
                            stage.status === VisibleProgressStageStatus.COMPLETED,
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400':
                            stage.status === VisibleProgressStageStatus.ACTIVE,
                        },
                      )}
                    >
                      {stage.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="rounded-lg bg-muted px-4 py-2.5 text-sm text-foreground">
              <div
                className="flex items-center gap-1"
                role="status"
                aria-label={THINKING_INDICATOR_LABEL}
              >
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
