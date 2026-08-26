import {
  ORCHESTRATION_STAGE_DOT_CLASSES,
  ORCHESTRATION_STAGE_ICONS,
  ORCHESTRATION_STAGE_LABEL_KEYS,
  ORCHESTRATION_STAGE_LINE_CLASSES,
  ORCHESTRATION_STAGE_PILL_CLASSES,
  ORCHESTRATION_STAGE_MOBILE_COLLAPSE_PX,
} from '@/constants/orchestration-stage.constants';
import { OrchestrationStageStatus } from '@/enums/orchestration-stage-status.enum';
import { cn } from '@/lib/utils';
import type { OrchestrationStageTimelineProps } from '@/types/orchestration.types';

// Vertical timeline of OrchestrationStage rows.
//
// Each row renders:
//   ┌ dot ┐   label           [actorName]   [status pill]
//   │  │  │   detail (line 2, optional)
//   └──┬──┘
//      │ connector line (hidden on last row)
//
// Mobile-first: below 480px (ORCHESTRATION_STAGE_MOBILE_COLLAPSE_PX) the
// label / actor / status pill collapse and only the dot + first line
// remain. We use the Tailwind `max-[479px]` arbitrary variant which is
// statically detectable so JIT picks it up at build time.
//
// Tokens used:
//   --duration-fast for the dot status transition
//   --ease-quint-out for the easing
//   semantic colour tokens via cn() — never raw blue-500 / green-500
//
// The component is render-only: it owns no state, opens no SSE, runs no
// timer. The host page maps its own progress signal into the stages
// array and feeds it in.
export function OrchestrationStageTimeline({
  stages,
  className,
  collapseOnMobile = true,
  t,
}: OrchestrationStageTimelineProps): React.ReactElement | null {
  if (stages.length === 0) {
    return null;
  }

  return (
    <ol
      className={cn('flex flex-col', className)}
      aria-label={t('orchestrationStage.timeline.title')}
      data-collapse-on-mobile={collapseOnMobile ? 'true' : 'false'}
      data-collapse-breakpoint={ORCHESTRATION_STAGE_MOBILE_COLLAPSE_PX}
    >
      {stages.map((stage, index) => {
        const Icon = ORCHESTRATION_STAGE_ICONS[stage.status];
        const isLast = index === stages.length - 1;
        const isActive = stage.status === OrchestrationStageStatus.Active;
        const statusLabel = t(ORCHESTRATION_STAGE_LABEL_KEYS[stage.status]);

        return (
          <li
            key={stage.id}
            className="grid grid-cols-[auto_1fr_auto] items-start gap-x-3 gap-y-1 text-xs"
            data-status={stage.status}
            aria-label={`${stage.label} — ${statusLabel}`}
          >
            {/* Dot column (always visible, also doubles as the connector
                anchor). */}
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-[var(--duration-fast)] ease-[var(--ease-quint-out)]',
                  ORCHESTRATION_STAGE_DOT_CLASSES[stage.status],
                )}
                aria-hidden="true"
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'animate-spin' : '')} />
              </span>
              {!isLast ? (
                <span
                  className={cn(
                    'mt-0.5 w-px flex-1 self-stretch',
                    'min-h-3',
                    ORCHESTRATION_STAGE_LINE_CLASSES[stage.status],
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            {/* Label + detail column. Collapses to dot-only under 480px when
                collapseOnMobile is true. */}
            <div className={cn('min-w-0 pb-3', collapseOnMobile ? 'max-[479px]:hidden' : '')}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-foreground font-medium">{stage.label}</span>
                {stage.actorName !== undefined && stage.actorName !== '' ? (
                  <span className="bg-muted touch:text-xs text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
                    {stage.actorName}
                  </span>
                ) : null}
              </div>
              {stage.detail !== undefined && stage.detail !== '' ? (
                <p className="text-muted-foreground mt-0.5 line-clamp-2">{stage.detail}</p>
              ) : null}
            </div>

            {/* Status pill column. Hidden when collapsed. */}
            <span
              className={cn(
                'touch:text-xs shrink-0 rounded-md px-1.5 py-0.5 text-[10px] tracking-wide uppercase',
                ORCHESTRATION_STAGE_PILL_CLASSES[stage.status],
                collapseOnMobile ? 'max-[479px]:hidden' : '',
              )}
            >
              {statusLabel}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
