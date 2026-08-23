import {
  DeploymentRunConclusion,
  type DeploymentRunStep,
  DeploymentRunStatus,
} from '@claw/shared-types';
import { Check, CircleDashed, CircleSlash, Loader2, X, type LucideIcon } from 'lucide-react';

import type { BadgeProps } from '@/components/ui/badge';

/**
 * One vocabulary for "how did this end", shared by runs, jobs and steps so the
 * same colour always means the same thing down the whole tree.
 */
export function runConclusionVariant(
  status: DeploymentRunStatus,
  conclusion: DeploymentRunConclusion | null,
): BadgeProps['variant'] {
  if (status === DeploymentRunStatus.IN_PROGRESS) {
    return 'info';
  }
  if (status !== DeploymentRunStatus.COMPLETED) {
    return 'secondary';
  }
  if (conclusion === DeploymentRunConclusion.SUCCESS) {
    return 'success';
  }
  if (
    conclusion === DeploymentRunConclusion.FAILURE ||
    conclusion === DeploymentRunConclusion.TIMED_OUT
  ) {
    return 'destructive';
  }
  return 'secondary';
}

/**
 * The i18n key describing a step's state. A completed step is described by its
 * conclusion; anything else by its status, because "queued" and "in progress"
 * have no conclusion yet.
 */
export function runStateKey(
  status: DeploymentRunStatus,
  conclusion: DeploymentRunConclusion | null,
): string {
  if (status === DeploymentRunStatus.COMPLETED && conclusion !== null) {
    return `adminDeployment.runConclusion.${conclusion}`;
  }
  return `adminDeployment.runStatus.${status}`;
}

/** Wall-clock duration of a step, in whole seconds, or null while unknown. */
export function stepDurationSeconds(step: DeploymentRunStep, nowMs: number): number | null {
  if (step.startedAt === null) {
    return null;
  }
  const started = Date.parse(step.startedAt);
  if (Number.isNaN(started)) {
    return null;
  }
  const ended = step.completedAt === null ? nowMs : Date.parse(step.completedAt);
  if (Number.isNaN(ended)) {
    return null;
  }
  return Math.max(0, Math.round((ended - started) / 1000));
}

/** Tailwind text tone for a step icon, matching its badge variant. */
export function runToneClass(variant: BadgeProps['variant']): string {
  if (variant === 'success') {
    return 'text-success';
  }
  if (variant === 'destructive') {
    return 'text-destructive';
  }
  if (variant === 'info') {
    return 'text-info';
  }
  return 'text-muted-foreground';
}

/**
 * Icon for a step, chosen from the same variant the badge uses so the glyph and
 * the colour can never disagree.
 */
export function runStepIcon(
  status: DeploymentRunStatus,
  variant: BadgeProps['variant'],
): LucideIcon {
  if (status === DeploymentRunStatus.IN_PROGRESS) {
    return Loader2;
  }
  if (variant === 'success') {
    return Check;
  }
  if (variant === 'destructive') {
    return X;
  }
  if (status === DeploymentRunStatus.COMPLETED) {
    return CircleSlash;
  }
  return CircleDashed;
}
