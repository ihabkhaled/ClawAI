import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeBottleneckBreakdownProps } from '@/types';
import {
  buildBottleneckSegments,
  formatBottleneckDuration,
} from '@/utilities';

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
    modelLoad: t('runtimeProgress.bottleneck.modelLoad'),
    promptEval: t('runtimeProgress.bottleneck.promptEval'),
    generation: t('runtimeProgress.bottleneck.generation'),
  };

  return (
    <div
      className={cn('flex w-full flex-col gap-1.5', className)}
      role="group"
      aria-label={t('runtimeProgress.bottleneck.ariaLabel')}
    >
      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span>{t('runtimeProgress.bottleneck.title')}</span>
        <span>{formatBottleneckDuration(total)}</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((seg) => {
          const widthPct = total > 0 ? (seg.durationMs / total) * 100 : 0;
          const isBottleneck = seg.stage === bottleneckStage;
          return (
            <div
              key={seg.stage}
              className={cn(
                'h-full transition-all',
                seg.stage === 'modelLoad' && 'bg-amber-500/80',
                seg.stage === 'promptEval' && 'bg-sky-500/80',
                seg.stage === 'generation' && 'bg-emerald-500/80',
                isBottleneck && 'ring-2 ring-offset-0 ring-foreground/40',
              )}
              style={{ width: `${String(widthPct)}%` }}
              title={`${stageLabels[seg.stage] ?? seg.stage}: ${formatBottleneckDuration(seg.durationMs)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {segments.map((seg) => (
          <span key={seg.stage} className="inline-flex items-center gap-1">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                seg.stage === 'modelLoad' && 'bg-amber-500/80',
                seg.stage === 'promptEval' && 'bg-sky-500/80',
                seg.stage === 'generation' && 'bg-emerald-500/80',
              )}
              aria-hidden
            />
            <span className="font-medium text-foreground">
              {stageLabels[seg.stage] ?? seg.stage}
            </span>
            <span>{formatBottleneckDuration(seg.durationMs)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
