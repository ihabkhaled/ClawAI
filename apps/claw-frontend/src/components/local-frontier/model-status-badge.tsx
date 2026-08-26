'use client';

import { CircleDot, Loader2 } from 'lucide-react';

import { FrontierLoadStatus } from '@/enums/local-frontier.enum';
import type { ModelStatusBadgeProps } from '@/types/local-frontier-ui.types';

export function ModelStatusBadge({
  loadStatus,
  isDownloaded,
  labels,
}: ModelStatusBadgeProps): React.ReactElement | null {
  if (loadStatus === FrontierLoadStatus.READY) {
    return (
      <span
        className="touch:text-xs inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
        title={labels.activeHint}
      >
        <CircleDot className="size-3" aria-hidden />
        {labels.active}
      </span>
    );
  }
  if (loadStatus === FrontierLoadStatus.LOADING) {
    return (
      <span className="touch:text-xs inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
        <Loader2 className="size-3 animate-spin" aria-hidden />
        {labels.loading}
      </span>
    );
  }
  if (loadStatus === FrontierLoadStatus.CRASHED || loadStatus === FrontierLoadStatus.FAILED) {
    return (
      <span
        className="border-destructive/30 bg-destructive/10 touch:text-xs text-destructive inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
        title={labels.crashedHint}
      >
        <CircleDot className="size-3" aria-hidden />
        {labels.crashed}
      </span>
    );
  }
  if (isDownloaded) {
    return (
      <span
        className="border-border bg-muted touch:text-xs text-muted-foreground inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
        title={labels.idleHint}
      >
        <CircleDot className="size-3" aria-hidden />
        {labels.idle}
      </span>
    );
  }
  return null;
}
