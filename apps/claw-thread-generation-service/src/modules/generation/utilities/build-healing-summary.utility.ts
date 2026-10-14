import {
  ThreadFailureClass,
  type ThreadGenerationHealing,
  type ThreadHealingAttempt,
  ThreadHealingResult,
  ThreadHealingStrategy,
} from '@claw/shared-types';

import type { StepRow } from '../types/step-recorder.types';
import { phaseOfStage } from './classify-failure.utility';

const STRATEGY_CODES: ReadonlySet<string> = new Set(Object.values(ThreadHealingStrategy));
const FAILURE_CLASSES: ReadonlySet<string> = new Set(Object.values(ThreadFailureClass));
const HEALING_OUTCOMES: ReadonlySet<string> = new Set(['RETRY', 'FALLBACK']);

function toStrategy(code: string | null): ThreadHealingStrategy | null {
  return code === null || !STRATEGY_CODES.has(code)
    ? null
    : (Object.values(ThreadHealingStrategy).find((value) => value === code) ?? null);
}

function toClass(excerpt: string | null): ThreadFailureClass {
  const text = excerpt?.trim() ?? '';
  return (
    Object.values(ThreadFailureClass).find(
      (value) => FAILURE_CLASSES.has(text) && value === text,
    ) ?? ThreadFailureClass.UNKNOWN
  );
}

/** How the call that followed a healing step ended: the first success or final failure of that model. */
function resultAfter(steps: readonly StepRow[], index: number, row: StepRow): ThreadHealingResult {
  for (const later of steps.slice(index + 1)) {
    if (later.roleId !== row.roleId) continue;
    const sameModel = later.provider === row.provider && later.model === row.model;
    if (!sameModel) continue;
    if (later.outcome === 'SUCCEEDED') return ThreadHealingResult.SUCCEEDED;
    if (later.outcome === 'FAILED') return ThreadHealingResult.FAILED;
  }
  return ThreadHealingResult.PENDING;
}

/**
 * What the service already tried, read from the owner's step log (ADR-181). A healing step is a
 * RETRY or FALLBACK row whose code is a strategy; its excerpt names the failure class it answered.
 * Nothing is stored separately, so the summary can never disagree with the log.
 */
export function buildHealingSummary(
  steps: readonly StepRow[],
  running: boolean,
): ThreadGenerationHealing {
  const attempts: ThreadHealingAttempt[] = [];
  for (const [index, row] of steps.entries()) {
    const strategy = toStrategy(row.code);
    if (strategy === null || !HEALING_OUTCOMES.has(row.outcome)) continue;
    attempts.push({
      seq: row.seq,
      phase: phaseOfStage(row.stage),
      roleId: row.roleId,
      strategy,
      failureClass: toClass(row.excerpt),
      provider: row.provider,
      model: row.model,
      result: resultAfter(steps, index, row),
    });
  }
  const last = attempts.at(-1);
  return { attempts, active: running && last?.result === ThreadHealingResult.PENDING };
}
