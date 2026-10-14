import type {
  ThreadGenerationProgress,
  ThreadGenerationQueue,
  ThreadGenerationRetryRequest,
  ThreadGenerationStepRoleKind,
} from '@claw/shared-types';

import {
  THREAD_EXCERPT_MAX_CHARS,
  MICRO_PER_USD,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  THREAD_GENERATION_CODE_KEYS,
  THREAD_PROGRESS_RETRYABLE_STATUSES,
  THREAD_RETRY_EDITABLE_ROLE_KINDS,
  THREAD_PROGRESS_TERMINAL_STATUSES,
  THREAD_STATUS_LABEL_KEYS,
  THREAD_STEP_ROLE_KEYS,
} from '@/constants/thread-generation-progress.constants';
import { ThreadGenerationJobStatus } from '@/enums/thread-generation-job-status.enum';
import type {
  BuildThreadRetryRequestInput,
  ThreadFailureKeys,
  ThreadI18nText,
  ThreadRetryRoleSelection,
} from '@/types/thread-generation-progress.types';
import { threadStageLabelKey } from '@/utilities/thread-generation-stage.utility';

export function isTerminalThreadStatus(status: string): boolean {
  return THREAD_PROGRESS_TERMINAL_STATUSES.includes(status);
}

/** A job that was accepted but has not been picked up: no stage, no attempt, no spend yet. */
export function isQueuedThreadStatus(status: string): boolean {
  return status === ThreadGenerationJobStatus.Queued;
}

/**
 * The line that says where a queued job stands (ADR-183): next in line, or how many runnable jobs
 * are ahead. A job waiting out a retry back-off, or from an older service, has no place in line.
 */
export function describeThreadQueue(
  queue: ThreadGenerationQueue | null | undefined,
): { key: string; params?: Record<string, number> } | null {
  if (!queue || queue.state !== 'WAITING_FOR_WORKER') {
    return null;
  }
  return queue.ahead === 0
    ? { key: 'chat.threadFixQueueNext' }
    : { key: 'chat.threadFixQueueAhead', params: { count: queue.ahead } };
}

/** True only for a real, positive spend; "0" or garbage means the figure is unknown, so say nothing. */
export function hasThreadSpend(micro: string): boolean {
  const value = Number(micro);
  return Number.isFinite(value) && value > 0;
}

function readRecordField(source: object, field: string): unknown {
  return Reflect.get(source, field);
}

/**
 * True when the platform refunded the Free allowance for this job. The field is newer than the
 * shared progress type, so it is read defensively and anything but a real `true` means "no".
 */
export function readAllowanceRefunded(progress: ThreadGenerationProgress): boolean {
  return readRecordField(progress, 'allowanceRefunded') === true;
}

function asMicroNumber(value: unknown): number {
  const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * The real spend of a job in micro-USD. Free jobs report money in `freeAllowanceMicroUsd`
 * (when present); paid jobs in `spentMicroCredits`. Returns "0" when neither is known.
 */
export function readThreadSpentMicro(progress: ThreadGenerationProgress): string {
  const spent = asMicroNumber(progress.spentMicroCredits);
  const free = asMicroNumber(readRecordField(progress, 'freeAllowanceMicroUsd'));
  return String(Math.max(spent, free));
}

/**
 * For a job that reports no money but did make model calls (plan-included calls charge $0):
 * the token total across its steps, 0 when no step carried counts. Null when the job made no
 * successful call, so a queued or instantly refused job says nothing.
 */
export function readIncludedUsageTokens(progress: ThreadGenerationProgress): number | null {
  const calls = progress.steps.filter(
    (step) => step.outcome === 'SUCCEEDED' && step.provider !== null,
  );
  if (calls.length === 0) {
    return null;
  }
  return calls.reduce((sum, step) => sum + (step.inputTokens ?? 0) + (step.outputTokens ?? 0), 0);
}

/** Label for a zero-money job that did make calls, with the token total when the steps carry one. */
export function describeIncludedUsage(progress: ThreadGenerationProgress): ThreadI18nText | null {
  const tokens = readIncludedUsageTokens(progress);
  if (tokens === null) {
    return null;
  }
  return tokens > 0
    ? {
        key: 'chat.threadProgress.includedInPlanTokens',
        params: { tokens: tokens.toLocaleString() },
      }
    : { key: 'chat.threadProgress.includedInPlan', params: {} };
}

export function isRetryableThreadStatus(status: string): boolean {
  return THREAD_PROGRESS_RETRYABLE_STATUSES.includes(status);
}

/** Key and params for "850 ms", "1.2 s" or "2m 5s"; the unit words come from i18n. */
export function describeStepDuration(durationMs: number): ThreadI18nText {
  if (durationMs < MS_PER_SECOND) {
    return {
      key: 'chat.threadProgress.durationUnit.ms',
      params: { value: String(Math.max(0, Math.round(durationMs))) },
    };
  }
  const wholeSeconds = Math.round(durationMs / MS_PER_SECOND);
  if (wholeSeconds < SECONDS_PER_MINUTE) {
    return {
      key: 'chat.threadProgress.durationUnit.s',
      params: { value: (durationMs / MS_PER_SECOND).toFixed(1) },
    };
  }
  const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
  return {
    key: 'chat.threadProgress.durationUnit.minSec',
    params: {
      minutes: String(minutes),
      seconds: String(wholeSeconds - minutes * SECONDS_PER_MINUTE),
    },
  };
}

/** Integer micro-USD (a string from the wire) as "$0.0123"; never throws on bad input. */
export function formatMicroUsd(micro: string): string {
  const value = Number(micro);
  if (!Number.isFinite(value)) {
    return '$0.00';
  }
  const fixed = (value / MICRO_PER_USD).toFixed(4);
  return `$${fixed.replace(/(\.\d\d)0+$/, '$1')}`;
}

/** Micro-USD string as a plain USD number string for an input, "" when unusable. */
export function microUsdToInputValue(micro: string): string {
  const value = Number(micro);
  return Number.isFinite(value) && value > 0 ? String(value / MICRO_PER_USD) : '';
}

export function truncateExcerpt(text: string): string {
  return text.length > THREAD_EXCERPT_MAX_CHARS
    ? `${text.slice(0, THREAD_EXCERPT_MAX_CHARS)}…`
    : text;
}

export function threadRoleLabelKey(roleKind: ThreadGenerationStepRoleKind): string {
  return THREAD_STEP_ROLE_KEYS[roleKind];
}

/** Message and suggestion keys for a machine code; an unknown code falls back to a generic pair. */
export function resolveThreadFailureKeys(code: string): ThreadFailureKeys {
  const known = THREAD_GENERATION_CODE_KEYS[code];
  if (known === undefined) {
    return {
      messageKey: 'chat.threadProgress.code.unknown',
      hintKey: 'chat.threadProgress.hint.unknown',
      params: { code },
    };
  }
  return {
    messageKey: `chat.threadProgress.code.${known}`,
    hintKey: `chat.threadProgress.hint.${known}`,
    params: { code },
  };
}

/**
 * The retry body: only what the owner actually changed, plus a fresh
 * idempotency key so the service treats it as a new job.
 */
export function buildThreadRetryRequest(
  input: BuildThreadRetryRequestInput,
): ThreadGenerationRetryRequest {
  const { progress, idempotencyKey, roles } = input;
  const request: ThreadGenerationRetryRequest = { idempotencyKey };
  const topic = input.topic.trim();
  if (topic !== '' && topic !== progress.selections.topic) {
    request.topic = topic;
  }
  const cap = Number(input.spendCapUsd);
  const originalCap = Number(progress.selections.spendCapMicroUsd) / MICRO_PER_USD;
  if (Number.isFinite(cap) && cap > 0 && cap !== originalCap) {
    request.spendCapUsd = cap;
  }
  const changed = roles.flatMap(({ roleId, model }) => {
    const original = progress.selections.roles.find((role) => role.roleId === roleId);
    return original?.provider === model.provider && original.model === model.model
      ? []
      : [{ roleId, provider: model.provider, model: model.model }];
  });
  if (changed.length > 0) {
    request.models = changed;
  }
  return request;
}

/** Wall-clock time of one step in the viewer's locale. */
export function formatStepTime(at: string): string {
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? at : date.toLocaleTimeString();
}

/** The label key for a job status, or null when the stage label says it better. */
export function threadStatusLabelKey(status: string): string | null {
  return THREAD_STATUS_LABEL_KEYS[status] ?? null;
}

/** The kind of the role that failed, when the selections name it. */
export function findFailedRoleKind(
  progress: Pick<ThreadGenerationProgress, 'failure' | 'selections'>,
): ThreadGenerationStepRoleKind | null {
  const roleId = progress.failure?.roleId ?? null;
  if (roleId === null) {
    return null;
  }
  return progress.selections.roles.find((role) => role.roleId === roleId)?.roleKind ?? null;
}

/** The roles the owner can re-pick a model for, pre-filled from the failed job. */
export function toThreadRetryRoleSelections(
  progress: ThreadGenerationProgress | undefined,
): ThreadRetryRoleSelection[] {
  return (progress?.selections.roles ?? [])
    .filter(({ roleKind }) => THREAD_RETRY_EDITABLE_ROLE_KINDS.includes(roleKind))
    .map(({ roleId, roleKind, provider, model }) => ({
      roleId,
      roleKind,
      model: { provider, model, displayName: model },
    }));
}

/** Label key for the headline: a terminal status wins, else the stage; null for an unknown stage. */
export function threadHeadlineKey(status: string, stage: string): string | null {
  return threadStatusLabelKey(status) ?? threadStageLabelKey(stage);
}
