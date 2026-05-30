import { randomUUID } from 'node:crypto';

import {
  type ClawRuntimeProgressEvent,
  RuntimeModality,
  RuntimeProgressEventType,
  RuntimeProgressStage,
  RuntimeProvider,
  StreamingErrorType,
  VisibleReasoningSource,
} from '@claw/shared-types';

/**
 * Input shape for {@link buildRuntimeProgressEvent}. Mirrors
 * {@link ClawRuntimeProgressEvent} but makes `id`, `createdAtMs`, and
 * `version` optional because the builder fills them with safe defaults.
 *
 * Every adapter should populate at least: `runId`, `provider`, `modality`,
 * `eventType`, `stage`, and `sequence`. The remaining fields are populated
 * as the adapter has data — content/reasoning deltas, metrics ticks,
 * artifact ids, and so on.
 */
export type BuildRuntimeProgressEventInput = Omit<
  ClawRuntimeProgressEvent,
  'id' | 'createdAtMs' | 'version'
> & {
  id?: string;
  createdAtMs?: number;
  version?: 'runtime-progress-v1';
};

/**
 * Build a fully-populated {@link ClawRuntimeProgressEvent} by filling in
 * the structural defaults the rest of the pipeline requires:
 * - `id` defaults to a fresh `crypto.randomUUID()`
 * - `createdAtMs` defaults to the current epoch millisecond timestamp
 * - `version` is always pinned to `'runtime-progress-v1'`
 *
 * The version field is intentionally not honored from caller input — every
 * envelope produced by this builder is on the v1 contract. If we ever add
 * v2, this builder will fork rather than silently accept a wrong version.
 */
export function buildRuntimeProgressEvent(
  input: BuildRuntimeProgressEventInput,
): ClawRuntimeProgressEvent {
  return {
    ...input,
    id: input.id ?? randomUUID(),
    createdAtMs: input.createdAtMs ?? Date.now(),
    version: 'runtime-progress-v1',
  };
}

const RUNTIME_PROVIDER_VALUES = new Set<string>(Object.values(RuntimeProvider));
const RUNTIME_MODALITY_VALUES = new Set<string>(Object.values(RuntimeModality));
const RUNTIME_EVENT_TYPE_VALUES = new Set<string>(Object.values(RuntimeProgressEventType));
const RUNTIME_STAGE_VALUES = new Set<string>(Object.values(RuntimeProgressStage));
const STREAMING_ERROR_TYPE_VALUES = new Set<string>(Object.values(StreamingErrorType));
const VISIBLE_REASONING_SOURCE_VALUES = new Set<string>(Object.values(VisibleReasoningSource));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNumberOrUndefined(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isStringOrUndefined(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

/**
 * Runtime type-guard for {@link ClawRuntimeProgressEvent}. Verifies the
 * presence of mandatory fields, that enum-shaped fields hold known values,
 * and that the version pin is exactly `'runtime-progress-v1'`. Used by
 * receivers (e.g. SSE bridges, audit consumers) to defend against
 * malformed cross-service payloads.
 */
export function isRuntimeProgressEvent(value: unknown): value is ClawRuntimeProgressEvent {
  if (!isRecord(value)) {
    return false;
  }
  if (!isNonEmptyString(value['id'])) {
    return false;
  }
  if (!isNonEmptyString(value['runId'])) {
    return false;
  }
  if (value['version'] !== 'runtime-progress-v1') {
    return false;
  }
  if (typeof value['createdAtMs'] !== 'number' || !Number.isFinite(value['createdAtMs'])) {
    return false;
  }
  if (typeof value['sequence'] !== 'number' || !Number.isFinite(value['sequence'])) {
    return false;
  }
  if (typeof value['provider'] !== 'string' || !RUNTIME_PROVIDER_VALUES.has(value['provider'])) {
    return false;
  }
  if (typeof value['modality'] !== 'string' || !RUNTIME_MODALITY_VALUES.has(value['modality'])) {
    return false;
  }
  if (
    typeof value['eventType'] !== 'string' ||
    !RUNTIME_EVENT_TYPE_VALUES.has(value['eventType'])
  ) {
    return false;
  }
  if (typeof value['stage'] !== 'string' || !RUNTIME_STAGE_VALUES.has(value['stage'])) {
    return false;
  }
  if (!isStringOrUndefined(value['contentDelta'])) {
    return false;
  }
  if (!isStringOrUndefined(value['reasoningDelta'])) {
    return false;
  }
  if (!isStringOrUndefined(value['rawProviderEventType'])) {
    return false;
  }
  if (
    value['errorType'] !== undefined &&
    (typeof value['errorType'] !== 'string' || !STREAMING_ERROR_TYPE_VALUES.has(value['errorType']))
  ) {
    return false;
  }
  if (
    value['visibleReasoningSource'] !== undefined &&
    (typeof value['visibleReasoningSource'] !== 'string' ||
      !VISIBLE_REASONING_SOURCE_VALUES.has(value['visibleReasoningSource']))
  ) {
    return false;
  }
  if (!isNumberOrUndefined(value['queuePosition'])) {
    return false;
  }
  return true;
}
