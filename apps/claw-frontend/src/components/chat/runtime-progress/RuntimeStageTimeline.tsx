import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { RuntimeStageTimelineProps } from '@/types';
import { formatBottleneckDuration } from '@/utilities';

// Renders the lifecycle stages as a vertical timeline. Each row shows the
// stage id, a status badge (active / completed / queued), and the elapsed
// duration in that stage. The currently-active row gets a pulsing dot so
// the user can see at a glance which step is running right now.
//
// PR2 fills in this body that PR1 left as a stub. Until the host hook wires
// `stageTimings` (and optionally `activeStage`), this component renders
// nothing — keeps PR2 a backward-compatible drop-in.
export function RuntimeStageTimeline({
  className,
  stageTimings,
  activeStage,
}: RuntimeStageTimelineProps): React.ReactElement | null {
  const { t } = useTranslation();
  if (stageTimings === undefined || stageTimings === null) {
    return null;
  }
  const entries = Object.entries(stageTimings);
  if (entries.length === 0) {
    return null;
  }

  return (
    <ol
      className={cn('flex flex-col gap-1.5', className)}
      aria-label={t('runtimeProgress.stageTimeline.title')}
    >
      {entries.map(([stage, window]) => {
        const isActive = stage === activeStage || window.endedAtMs === undefined;
        const isCompleted = window.endedAtMs !== undefined && !isActive;
        const duration =
          window.endedAtMs !== undefined
            ? window.endedAtMs - window.startedAtMs
            : Math.max(0, Date.now() - window.startedAtMs);
        let statusLabel = t('runtimeProgress.stageTimeline.queued');
        if (isActive) {
          statusLabel = t('runtimeProgress.stageTimeline.active');
        } else if (isCompleted) {
          statusLabel = t('runtimeProgress.stageTimeline.completed');
        }

        return (
          <li
            key={stage}
            className="touch:text-xs grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[11px]"
            data-stage={stage}
            data-status={isActive ? 'active' : 'completed'}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isActive ? 'animate-pulse bg-sky-500' : 'bg-emerald-500/70',
              )}
              aria-hidden
            />
            <span className="text-foreground truncate font-medium">{stage}</span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span className="bg-muted touch:text-xs rounded-full px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                {statusLabel}
              </span>
              <span className="tabular-nums">{formatBottleneckDuration(duration)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
