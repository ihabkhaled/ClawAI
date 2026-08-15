import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  RefreshCw,
  StopCircle,
  XCircle,
} from 'lucide-react';

import { RuntimeBottleneckBreakdown } from '@/components/chat/runtime-progress/RuntimeBottleneckBreakdown';
import { RuntimeMetricsHud } from '@/components/chat/runtime-progress/RuntimeMetricsHud';
import { RuntimeRawEventsDrawer } from '@/components/chat/runtime-progress/RuntimeRawEventsDrawer';
import { RuntimeStageTimeline } from '@/components/chat/runtime-progress/RuntimeStageTimeline';
import { VisibleReasoningPanel } from '@/components/chat/runtime-progress/VisibleReasoningPanel';
import { StreamLiveAnswer } from '@/components/chat/stream/stream-live-answer';
import { StreamProgressBar } from '@/components/chat/stream/stream-progress-bar';
import { StreamStageBadge } from '@/components/chat/stream/stream-stage-badge';
import { Button } from '@/components/ui/button';
import { THINKING_INDICATOR_LABEL } from '@/constants';
import { AiStreamStage, FallbackFailureType, VisibleProgressStageStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeProgressPanelProps } from '@/types';
import { formatElapsed, resolveRouterTraceDescription, resolveRouterTraceLabel } from '@/utilities';

// Top-level pluggable progress panel. Composes the existing stream-*
// primitives (StreamStageBadge, StreamProgressBar, StreamLiveAnswer) with
// the new runtime-neutral sub-panels (VisibleReasoningPanel,
// RuntimeMetricsHud, RuntimeRawEventsDrawer, RuntimeStageTimeline). The
// fallback-attempts list, stream error block, and bottom "thinking dots"
// are kept as-is so PR1 ships identical behaviour to the legacy
// ThinkingIndicator — only the internal composition changes.
//
// PR2 will populate RuntimeMetricsHud with llama.cpp metrics, swap the
// inline recent-stages list for RuntimeStageTimeline, and surface
// showRawEvents=true behind a developer toggle.
export function RuntimeProgressPanel({
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
  showRawEvents = false,
  rawEvents,
  executionProfile,
  showBottleneck = true,
}: RuntimeProgressPanelProps): React.ReactElement {
  const { t } = useTranslation();
  const hasFallbacks = fallbackAttempts !== undefined && fallbackAttempts.length > 0;
  const recentStages = progressStages?.slice(-6) ?? [];
  const hasLiveStream =
    streamLive !== undefined &&
    (streamLive.content.length > 0 ||
      streamLive.reasoning.length > 0 ||
      streamLive.metrics !== undefined ||
      streamLive.stage !== undefined);

  let statusLabel: string;
  if (judgeEvaluating === true) {
    statusLabel = t('chat.verifyingWith', { model: judgeModel ?? t('chat.judge') });
  } else if (currentStageLabel !== null && currentStageLabel !== undefined) {
    statusLabel = currentStageLabel;
  } else if (hasFallbacks) {
    statusLabel = t('chat.fallbackRetrying');
  } else if (executingModel !== null && executingModel !== undefined) {
    statusLabel = t('chat.modelThinking', { model: executingModel });
  } else {
    statusLabel = THINKING_INDICATOR_LABEL;
  }

  const handleRawEventsToggle = (_isOpen: boolean): void => {
    // PR1 keeps the drawer open state stateless — parent controls it via
    // `showRawEvents`. PR2 will lift the open state into a controller hook
    // so dev users can pin the drawer between stages.
  };

  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="flex max-w-[85%] flex-col items-start gap-1.5">
        {hasFallbacks && fallbackAttempts !== undefined ? (
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
                {attempt.nextProvider !== undefined && attempt.nextProvider !== null ? (
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

        {streamError !== null && streamError !== undefined && streamError !== '' ? (
          <div
            role="alert"
            aria-live="assertive"
            className="bg-destructive/10 text-destructive flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs"
          >
            <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{streamError}</span>
          </div>
        ) : (
          <>
            {hasLiveStream && streamLive !== undefined ? (
              <section
                className="bg-card w-full max-w-xl min-w-[18rem] overflow-hidden rounded-2xl border border-sky-500/25 shadow-sm"
                aria-label={t('chat.stream.liveResponse')}
                aria-live="polite"
                aria-atomic="false"
              >
                <div className="border-border/60 flex items-center justify-between gap-3 border-b px-3 py-2">
                  <div className="flex items-center gap-2">
                    <StreamStageBadge stage={streamLive.stage} />
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
                      <CircleDot className="h-3 w-3 animate-pulse text-sky-500" />
                      {t('chat.live')}
                    </span>
                  </div>
                  {onCancel !== undefined ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive h-7 gap-1 px-2 text-xs"
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
                  {streamLive.metrics !== undefined ? (
                    <StreamProgressBar
                      percent={streamLive.metrics.progressPercent}
                      confidence={streamLive.metrics.progressConfidence}
                    />
                  ) : null}
                  <VisibleReasoningPanel
                    reasoning={streamLive.reasoning}
                    visibility={streamLive.reasoningVisibility}
                  />
                  <StreamLiveAnswer
                    content={streamLive.content}
                    isStreaming={streamLive.isStreaming}
                  />
                  <RuntimeMetricsHud
                    metrics={streamLive.metrics ?? null}
                    usage={streamLive.usage ?? null}
                    executionProfile={executionProfile}
                  />
                  {showBottleneck &&
                  !streamLive.isStreaming &&
                  (streamLive.stage === AiStreamStage.COMPLETE ||
                    streamLive.metrics?.bottleneck !== undefined) ? (
                    <RuntimeBottleneckBreakdown
                      stageTimings={streamLive.metrics?.stageTimings ?? null}
                      metrics={streamLive.metrics ?? null}
                    />
                  ) : null}
                  {showBottleneck && streamLive.metrics?.stageTimings !== undefined ? (
                    <RuntimeStageTimeline
                      stageTimings={streamLive.metrics.stageTimings}
                      activeStage={streamLive.stage}
                    />
                  ) : null}
                  {showRawEvents ? (
                    <RuntimeRawEventsDrawer
                      events={rawEvents ?? []}
                      isOpen={false}
                      onToggle={handleRawEventsToggle}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}
            <section
              className="via-background w-full max-w-xl min-w-[18rem] overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-emerald-500/10 shadow-sm"
              aria-label={t('chat.currentAiProgress', { status: statusLabel })}
              aria-live="polite"
              aria-atomic="false"
            >
              <div className="border-border/60 flex items-center justify-between gap-3 border-b px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold tracking-[0.2em] text-sky-700 uppercase dark:text-sky-300">
                    {t('chat.visibleAiProgress')}
                  </div>
                  <div className="text-foreground truncate text-sm font-medium">{statusLabel}</div>
                </div>
                <div className="bg-background/80 text-muted-foreground flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px]">
                  <CircleDot className="h-3 w-3 animate-pulse text-sky-500" />
                  {t('chat.live')}
                </div>
              </div>
              {recentStages.length > 0 ? (
                <div className="flex flex-col gap-2 px-3 py-2.5">
                  {recentStages.map((stage, index) => {
                    const label = resolveRouterTraceLabel(stage.id, t, stage.label);
                    const description = resolveRouterTraceDescription(
                      stage.id,
                      t,
                      stage.description,
                    );

                    return (
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
                            <span className="text-foreground font-medium">{label}</span>
                            {stage.actorName !== undefined && stage.actorName !== null ? (
                              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                                {stage.actorName}
                              </span>
                            ) : null}
                          </div>
                          {description !== undefined && description !== null ? (
                            <div className="text-muted-foreground line-clamp-2">{description}</div>
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] tracking-wide uppercase',
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
                          <div className="border-border/80 ml-2.5 h-2 border-l" aria-hidden />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
            <div className="bg-muted text-foreground rounded-lg px-4 py-2.5 text-sm">
              <div
                className="flex items-center gap-2"
                role="status"
                aria-label={THINKING_INDICATOR_LABEL}
              >
                <div className="flex items-center gap-1" aria-hidden="true">
                  <span className="bg-muted-foreground inline-block h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                  <span className="bg-muted-foreground inline-block h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                  <span className="bg-muted-foreground inline-block h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
                </div>
                {executingModel !== null && executingModel !== undefined ? (
                  <span className="text-muted-foreground text-xs font-medium">
                    {executingModel}
                  </span>
                ) : null}
                {streamLive?.metrics?.elapsedMs !== undefined ? (
                  <span className="text-muted-foreground/80 ms-auto font-mono text-[11px] tabular-nums">
                    {formatElapsed(streamLive.metrics.elapsedMs)}
                  </span>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
