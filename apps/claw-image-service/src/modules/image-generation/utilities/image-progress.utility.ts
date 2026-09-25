import { type ClawRuntimeProgressEvent, RuntimeProgressConfidence } from '@claw/shared-types';

import { type ImageProgressSnapshot } from '../types/image-generation.types';

/**
 * The observed slice of a runtime-progress envelope, ready for the card.
 *
 * Stage always; step counts and elapsed time when the runtime sent them; a
 * percentage ONLY when the runtime measured it. An estimated percentage
 * (`STAGE_ESTIMATED`, `HEURISTIC`, `TOKEN_BOUND`) is left out, so the card
 * never shows a number nobody observed. The preview frame and runtime URL are
 * never forwarded.
 */
export function toImageProgressSnapshot(event: ClawRuntimeProgressEvent): ImageProgressSnapshot {
  const metrics = event.metrics;
  const measured =
    metrics?.progressConfidence === RuntimeProgressConfidence.EXACT ||
    metrics?.progressConfidence === RuntimeProgressConfidence.RUNTIME_REPORTED;
  return {
    stage: event.stage,
    ...(metrics?.currentStep === undefined ? {} : { currentStep: metrics.currentStep }),
    ...(metrics?.totalSteps === undefined ? {} : { totalSteps: metrics.totalSteps }),
    ...(metrics === undefined ? {} : { elapsedMs: metrics.elapsedMs }),
    ...(measured && metrics.progressPercent !== undefined
      ? { progressPercent: metrics.progressPercent }
      : {}),
  };
}
