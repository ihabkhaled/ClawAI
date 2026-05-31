import { CheckCircle2, CircleDashed, Loader2, Sparkles } from 'lucide-react';

import { ComfyUINodeTimelineStatus } from '@/enums/comfyui-node-timeline-status.enum';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ComfyUINodeTimelineProps } from '@/types/comfyui-node-timeline.types';
import { deriveComfyUITimeline } from '@/utilities/comfyui-node-timeline.utility';

/**
 * Per-node execution timeline for ComfyUI generations. Renders the
 * sorted list of workflow nodes as a stacked column:
 *   - Each row shows: status icon + friendly label + status pill ("X of Y").
 *   - Currently-executing node is highlighted; completed nodes are
 *     ticked; nodes that ComfyUI reported as cached carry a "cached"
 *     pill so the user understands why they finished instantly.
 *
 * The component is a pure render of `deriveComfyUITimeline(events)` —
 * caller passes the full ordered event list for the run.
 */
export function ComfyUINodeTimeline({
  events,
  className,
}: ComfyUINodeTimelineProps): React.ReactElement | null {
  const { t } = useTranslation();
  const entries = deriveComfyUITimeline(events);
  if (entries.length === 0) {
    return null;
  }
  const total = entries.length;
  return (
    <section
      className={cn(
        'flex flex-col gap-1.5 rounded-xl border border-border bg-card/40 p-3',
        className,
      )}
      aria-label={t('runtimeProgress.comfyui.timeline')}
    >
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t('runtimeProgress.comfyui.timeline')}
      </div>
      {entries.map((entry, idx) => {
        let icon: React.ReactElement;
        if (entry.cached) {
          icon = <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />;
        } else if (entry.status === ComfyUINodeTimelineStatus.COMPLETED) {
          icon = <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />;
        } else if (entry.status === ComfyUINodeTimelineStatus.EXECUTING) {
          icon = (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-500" aria-hidden />
          );
        } else {
          icon = (
            <CircleDashed className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          );
        }
        let pillLabel: string;
        if (entry.cached) {
          pillLabel = t('runtimeProgress.comfyui.cached');
        } else {
          pillLabel = t('runtimeProgress.comfyui.stepOf', {
            current: String(idx + 1),
            total: String(total),
          });
        }
        return (
          <div
            key={entry.nodeId}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs',
              entry.status === ComfyUINodeTimelineStatus.EXECUTING && 'bg-sky-500/10',
            )}
          >
            {icon}
            <span
              className={cn(
                'truncate font-medium',
                entry.status === ComfyUINodeTimelineStatus.COMPLETED
                  ? 'text-foreground'
                  : 'text-muted-foreground',
                entry.status === ComfyUINodeTimelineStatus.EXECUTING && 'text-foreground',
              )}
            >
              {entry.label}
            </span>
            <span className="ml-auto text-[10px] tracking-wide text-muted-foreground">
              {pillLabel}
            </span>
          </div>
        );
      })}
    </section>
  );
}
