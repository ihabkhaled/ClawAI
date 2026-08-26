import { StreamBottleneckStage } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeBottleneckBreakdownProps } from '@/types';
import { buildBottleneckSegments, formatBottleneckDuration } from '@/utilities';

// Horizontal stacked-segment bar showing the relative weight of the
// modelLoad / promptEval / generation stages once a local-runtime stream
// finishes. Renders nothing when no per-stage durations are available
// (cloud streams, cached responses, terminated runs).
//
// The bottleneck stage gets a thicker, higher-contrast border so it pops
// at a glance even on a busy chat scroll.
export function RuntimeBottleneckBreakdown({
  className,
  stageTimings,
  metrics,
}: RuntimeBottleneckBreakdownProps): React.ReactElement | null {
  const { t } = useTranslation();
  const segments = buildBottleneckSegments(stageTimings ?? null, metrics ?? null);
  if (segments.length === 0) {
    return null;
  }

  const total = segments.reduce((sum, seg) => sum + seg.durationMs, 0);
  const bottleneckStage = metrics?.bottleneck?.stage;
  const stageLabels: Record<string, string> = {
    [StreamBottleneckStage.MODEL_LOAD]: t('runtimeProgress.bottleneck.modelLoad'),
    [StreamBottleneckStage.PROMPT_EVAL]: t('runtimeProgress.bottleneck.promptEval'),
    [StreamBottleneckStage.GENERATION]: t('runtimeProgress.bottleneck.generation'),
  };

  return (
    <div
      className={cn('flex w-full flex-col gap-1.5', className)}
      role="group"
      aria-label={t('runtimeProgress.bottleneck.ariaLabel')}
    >
      <div className="touch:text-xs text-muted-foreground flex items-center justify-between text-[11px] font-medium">
        <span>{t('runtimeProgress.bottleneck.title')}</span>
        <span>{formatBottleneckDuration(total)}</span>
      </div>
      <div className="bg-muted flex h-2 w-full overflow-hidden rounded-full">
        {segments.map((seg) => {
          const widthPct = total > 0 ? (seg.durationMs / total) * 100 : 0;
          const isBottleneck = seg.stage === bottleneckStage;
          return (
            <div
              key={seg.stage}
              className={cn(
                'h-full transition-all',
                seg.stage === StreamBottleneckStage.MODEL_LOAD && 'bg-amber-500/80',
                seg.stage === StreamBottleneckStage.PROMPT_EVAL && 'bg-sky-500/80',
                seg.stage === StreamBottleneckStage.GENERATION && 'bg-emerald-500/80',
                isBottleneck && 'ring-foreground/40 ring-2 ring-offset-0',
              )}
              style={{ width: `${String(widthPct)}%` }}
              title={`${stageLabels[seg.stage] ?? seg.stage}: ${formatBottleneckDuration(seg.durationMs)}`}
            />
          );
        })}
      </div>
      <div className="touch:text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
        {segments.map((seg) => (
          <span key={seg.stage} className="inline-flex items-center gap-1">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                seg.stage === StreamBottleneckStage.MODEL_LOAD && 'bg-amber-500/80',
                seg.stage === StreamBottleneckStage.PROMPT_EVAL && 'bg-sky-500/80',
                seg.stage === StreamBottleneckStage.GENERATION && 'bg-emerald-500/80',
              )}
              aria-hidden
            />
            <span className="text-foreground font-medium">
              {stageLabels[seg.stage] ?? seg.stage}
            </span>
            <span>{formatBottleneckDuration(seg.durationMs)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
