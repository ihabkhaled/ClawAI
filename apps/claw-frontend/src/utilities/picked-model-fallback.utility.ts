import {
  PICKED_MODEL_FAILED_CODE,
  PICKED_MODEL_NON_CHAT_ID_PATTERN,
  PICKED_MODEL_MAX_SUGGESTIONS,
  PICKED_MODEL_RECOVERABLE_ERROR_CODES,
} from '@/constants/picked-model-fallback.constants';
import { RoutingMode } from '@/enums';
import type { ModelPickerGroup } from '@/types/component.types';
import type {
  PickedModelFallbackInfo,
  SuggestedModelChoice,
  SuggestedModelRef,
} from '@/types/picked-model-fallback.types';
import { decodeModelValue, encodeModelValue } from '@/utilities/model-selector.utility';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** `metadata.pickedModelFallback`, or null when no substitute answered. */
export function readPickedModelFallback(
  metadata: Record<string, unknown> | null,
): PickedModelFallbackInfo | null {
  const record = asRecord(metadata?.['pickedModelFallback']);
  if (record === null) {
    return null;
  }
  const originalProvider = record['originalProvider'];
  const originalModel = record['originalModel'];
  if (!nonEmpty(originalProvider) || !nonEmpty(originalModel)) {
    return null;
  }
  // Anything but an explicit `false` reads as costlier: saying so is cheap.
  return { originalProvider, originalModel, costlier: record['costlier'] !== false };
}

/** `metadata.suggestedModels`: valid pairs only, at most three. */
export function readSuggestedModels(metadata: Record<string, unknown> | null): SuggestedModelRef[] {
  const raw = metadata?.['suggestedModels'];
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: SuggestedModelRef[] = [];
  for (const entry of raw) {
    const record = asRecord(entry);
    const provider = record?.['provider'];
    const model = record?.['model'];
    if (nonEmpty(provider) && nonEmpty(model)) {
      result.push({ provider, model });
    }
  }
  return result.slice(0, PICKED_MODEL_MAX_SUGGESTIONS);
}

/**
 * Whether a stored reply should offer "try another model": the picked model and
 * its substitutes failed, or a manually picked model hit a provider failure.
 */
export function offersPickedModelRecovery(
  metadata: Record<string, unknown> | null,
  routingMode: string | null | undefined,
): boolean {
  if (metadata?.['error'] !== true) {
    return false;
  }
  const code = metadata['errorCode'];
  if (typeof code !== 'string') {
    return false;
  }
  if (code === PICKED_MODEL_FAILED_CODE) {
    return true;
  }
  return routingMode === RoutingMode.MANUAL_MODEL && PICKED_MODEL_RECOVERABLE_ERROR_CODES.has(code);
}

function labelFor(groups: readonly ModelPickerGroup[], ref: SuggestedModelRef): string {
  const value = encodeModelValue(ref.provider, ref.model);
  for (const group of groups) {
    const option = group.options.find((candidate) => candidate.value === value);
    if (option !== undefined) {
      return option.label;
    }
  }
  return ref.model;
}

/**
 * The (up to three) models the recovery buttons offer. The backend's list wins
 * (it knows the plan, exposure and what was already tried); when it sent none,
 * the picker's own models stand in, minus the one that failed.
 */
export function chooseRecoverySuggestions(
  suggested: readonly SuggestedModelRef[],
  groups: readonly ModelPickerGroup[],
  failed: SuggestedModelRef | null,
): SuggestedModelChoice[] {
  const isFailed = (ref: SuggestedModelRef): boolean =>
    failed !== null && ref.provider === failed.provider && ref.model === failed.model;
  const source: SuggestedModelRef[] =
    suggested.length > 0
      ? [...suggested]
      : groups.flatMap((group) =>
          group.options.flatMap((option) => {
            const decoded = decodeModelValue(option.value);
            return decoded === null || PICKED_MODEL_NON_CHAT_ID_PATTERN.test(decoded.model)
              ? []
              : [decoded];
          }),
        );
  return source
    .filter((ref) => !isFailed(ref))
    .slice(0, PICKED_MODEL_MAX_SUGGESTIONS)
    .map((ref) => ({ ...ref, label: labelFor(groups, ref) }));
}
