import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  RefreshCw,
  StopCircle,
  XCircle,
} from 'lucide-react';

import { StreamLiveAnswer } from '@/components/chat/stream/stream-live-answer';
import { StreamMetricsHud } from '@/components/chat/stream/stream-metrics-hud';
import { StreamProgressBar } from '@/components/chat/stream/stream-progress-bar';
import { StreamStageBadge } from '@/components/chat/stream/stream-stage-badge';
import { StreamThinkingPanel } from '@/components/chat/stream/stream-thinking-panel';
import { Button } from '@/components/ui/button';
import { THINKING_INDICATOR_LABEL } from '@/constants';
import { FallbackFailureType, VisibleProgressStageStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
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
  streamLive,
  onCancel,
  isCancelling,
}: ThinkingIndicatorProps) {
  const { t } = useTranslation();
  const hasFallbacks = fallbackAttempts && fallbackAttempts.length > 0;
  const recentStages = progressStages?.slice(-6) ?? [];
  const hasLiveStream =
    streamLive !== undefined &&
    (streamLive.content.length > 0 ||
      streamLive.reasoning.length > 0 ||
      streamLive.metrics !== undefined ||
      streamLive.stage !== undefined);

  let statusLabel: string;
  if (judgeEvaluating) {
    statusLabel = t('chat.verifyingWith', { model: judgeModel ?? t('chat.judge') });
  } else if (currentStageLabel) {
    statusLabel = currentStageLabel;
  } else if (hasFallbacks) {
    statusLabel = t('chat.fallbackRetrying');
  } else if (executingModel) {
    statusLabel = t('chat.modelThinking', { model: executingModel });
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
                  {attempt.failureType === FallbackFailureType.QUALITY
                    ? t('chat.weakResponse')
                    : t('chat.providerFailed')}
                </span>
                {attempt.nextProvider ? (
                  <>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    <span>
                      {t('chat.tryingFallback', {
                        provider: attempt.nextProvider,
                        model: attempt.nextModel ?? '',
                      })}
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
            {hasLiveStream && streamLive ? (
              <section
                className="w-full min-w-[18rem] max-w-xl overflow-hidden rounded-2xl border border-sky-500/25 bg-card shadow-sm"
                aria-label={t('chat.stream.liveResponse')}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <StreamStageBadge stage={streamLive.stage} />
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CircleDot className="h-3 w-3 animate-pulse text-sky-500" />
                      {t('chat.live')}
                    </span>
                  </div>
                  {onCancel ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={onCancel}
                      disabled={isCancelling}
                      aria-label={t('chat.stream.cancel')}
                    >
                      <StopCircle className="h-3.5 w-3.5" />
                      {t('chat.stream.cancel')}
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2.5 px-3 py-2.5">
                  {streamLive.metrics ? (
                    <StreamProgressBar
                      percent={streamLive.metrics.progressPercent}
                      confidence={streamLive.metrics.progressConfidence}
                    />
                  ) : null}
                  <StreamThinkingPanel
                    reasoning={streamLive.reasoning}
                    visibility={streamLive.reasoningVisibility}
                  />
                  <StreamLiveAnswer
                    content={streamLive.content}
                    isStreaming={streamLive.isStreaming}
                  />
                  <StreamMetricsHud metrics={streamLive.metrics} usage={streamLive.usage} />
                </div>
              </section>
            ) : null}
            <section
              className="w-full min-w-[18rem] max-w-xl overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-background to-emerald-500/10 shadow-sm"
              aria-label={t('chat.currentAiProgress', { status: statusLabel })}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                    {t('chat.visibleAiProgress')}
                  </div>
                  <div className="truncate text-sm font-medium text-foreground">{statusLabel}</div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-1 text-[11px] text-muted-foreground">
                  <CircleDot className="h-3 w-3 animate-pulse text-sky-500" />
                  {t('chat.live')}
                </div>
              </div>
              {recentStages.length > 0 ? (
                <div className="flex flex-col gap-2 px-3 py-2.5">
                  {recentStages.map((stage, index) => (
                    <div
                      key={stage.id}
                      className="grid grid-cols-[auto_1fr_auto] items-start gap-2 text-xs"
                    >
                      <div
                        className={cn(
                          'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border',
                          stage.status === VisibleProgressStageStatus.COMPLETED
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                            : 'border-sky-500/40 bg-sky-500/10 text-sky-600',
                        )}
                      >
                        {stage.status === VisibleProgressStageStatus.COMPLETED ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-medium text-foreground">{stage.label}</span>
                          {stage.actorName ? (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                              {stage.actorName}
                            </span>
                          ) : null}
                        </div>
                        {stage.description ? (
                          <div className="line-clamp-2 text-muted-foreground">
                            {stage.description}
                          </div>
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
                              stage.status === VisibleProgressStageStatus.ACTIVE ||
                              stage.status === VisibleProgressStageStatus.QUEUED,
                          },
                        )}
                      >
                        {stage.status}
                      </span>
                      {index < recentStages.length - 1 ? (
                        <div className="ml-2.5 h-2 border-l border-border/80" aria-hidden />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
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
