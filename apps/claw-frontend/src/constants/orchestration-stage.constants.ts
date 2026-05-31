import { Check, CircleDashed, Loader2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { OrchestrationStageStatus } from '@/enums/orchestration-stage-status.enum';

// Per-status Tailwind class fragments applied to the timeline dot. Each
// status maps onto one of the four semantic colour groups in globals.css
// (muted / primary / success / destructive) so dark mode is handled by
// the CSS-variable theme without `dark:` prefixes.
export const ORCHESTRATION_STAGE_DOT_CLASSES: Record<OrchestrationStageStatus, string> = {
  [OrchestrationStageStatus.Pending]: 'border-border bg-muted text-muted-foreground',
  [OrchestrationStageStatus.Active]:
    'border-primary/40 bg-primary/10 text-primary animate-pulse',
  [OrchestrationStageStatus.Done]:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  [OrchestrationStageStatus.Failed]:
    'border-destructive/40 bg-destructive/10 text-destructive',
};

// Per-status accent class applied to the connecting vertical line below
// each timeline row. Mirrors the dot palette so a completed stage's tail
// reads as a continuous emerald line into the next row.
export const ORCHESTRATION_STAGE_LINE_CLASSES: Record<OrchestrationStageStatus, string> = {
  [OrchestrationStageStatus.Pending]: 'bg-border',
  [OrchestrationStageStatus.Active]: 'bg-primary/40',
  [OrchestrationStageStatus.Done]: 'bg-emerald-500/50',
  [OrchestrationStageStatus.Failed]: 'bg-destructive/40',
};

// Per-status status pill class applied on the right edge of each row.
export const ORCHESTRATION_STAGE_PILL_CLASSES: Record<OrchestrationStageStatus, string> = {
  [OrchestrationStageStatus.Pending]: 'bg-muted text-muted-foreground',
  [OrchestrationStageStatus.Active]: 'bg-primary/10 text-primary',
  [OrchestrationStageStatus.Done]:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  [OrchestrationStageStatus.Failed]: 'bg-destructive/10 text-destructive',
};

// Per-status lucide icon rendered inside the dot.
export const ORCHESTRATION_STAGE_ICONS: Record<OrchestrationStageStatus, LucideIcon> = {
  [OrchestrationStageStatus.Pending]: CircleDashed,
  [OrchestrationStageStatus.Active]: Loader2,
  [OrchestrationStageStatus.Done]: Check,
  [OrchestrationStageStatus.Failed]: X,
};

// i18n key used to localise the status pill label. Hosts pass the
// already-resolved t() function and the timeline reads
// `t(ORCHESTRATION_STAGE_LABEL_KEYS[status])`.
export const ORCHESTRATION_STAGE_LABEL_KEYS: Record<OrchestrationStageStatus, string> = {
  [OrchestrationStageStatus.Pending]: 'orchestrationStage.status.pending',
  [OrchestrationStageStatus.Active]: 'orchestrationStage.status.active',
  [OrchestrationStageStatus.Done]: 'orchestrationStage.status.done',
  [OrchestrationStageStatus.Failed]: 'orchestrationStage.status.failed',
};

// Mobile-collapse breakpoint pixel value. The timeline switches to a
// compact icon-only column below this width via a CSS container query
// expressed in arbitrary Tailwind values.
export const ORCHESTRATION_STAGE_MOBILE_COLLAPSE_PX = 480;
