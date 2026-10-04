import type { CheckedState } from '@radix-ui/react-checkbox';

import { MODEL_EXPOSURE_BATCH_SIZE, PROVIDER_DISPLAY_NAMES } from '@/constants';
import {
  CONNECTOR_MODEL_LIFECYCLE_BADGE_CLASSES,
  CONNECTOR_MODEL_LIFECYCLE_LABEL_KEYS,
} from '@/constants/model-exposure.constants';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import { ConnectorModelLifecycle } from '@/enums/connector-model-lifecycle.enum';
import { ModelExposureFilterOption } from '@/enums/model-exposure-filter.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type { ProviderCreditPolicy } from '@/types/model-billing.types';
import type {
  ConnectorModelRow,
  ModelExposureFilters,
  ModelExposureRowView,
} from '@/types/model-exposure.types';

import { resolveModelBilling } from './model-billing.utility';

// Pure — no network, so it is unit tested without a server.
export function chunkModelKeys(modelKeys: readonly string[]): string[][] {
  if (modelKeys.length === 0) {
    return [];
  }
  const chunks: string[][] = [];
  for (let i = 0; i < modelKeys.length; i += MODEL_EXPOSURE_BATCH_SIZE) {
    chunks.push(modelKeys.slice(i, i + MODEL_EXPOSURE_BATCH_SIZE));
  }
  return chunks;
}

// A generic "Validation failed" told an operator nothing (2026-09-24: bulk
// exposing 447 OpenRouter models hit the backend's 200-key cap and gave no
// clue why). ApiClientError.errors is a Record<field, message[]> when the
// backend rejected the DTO — build a readable sentence from it before
// falling back to the generic message.
export function describeModelExposureError(err: unknown): string {
  if (err instanceof ApiClientError && err.errors !== undefined) {
    const detail = Object.entries(err.errors)
      .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
      .join('; ');
    if (detail.length > 0) {
      return detail;
    }
  }
  return err instanceof Error ? err.message : 'Failed to apply';
}

/** A copy of the selection without these keys. */
export function removeKeys(selected: ReadonlySet<string>, keys: readonly string[]): Set<string> {
  const next = new Set(selected);
  for (const key of keys) {
    next.delete(key);
  }
  return next;
}

export function toModelExposureFilterOption(
  exposedOnly: boolean | null,
): ModelExposureFilterOption {
  if (exposedOnly === null) {
    return ModelExposureFilterOption.ALL;
  }
  return exposedOnly ? ModelExposureFilterOption.EXPOSED : ModelExposureFilterOption.UNEXPOSED;
}

export function fromModelExposureFilterOption(value: string): boolean | null {
  if (value === ModelExposureFilterOption.EXPOSED) {
    return true;
  }
  return value === ModelExposureFilterOption.UNEXPOSED ? false : null;
}

/** The header checkbox: all, some (indeterminate) or none of the shown rows. */
export function resolveSelectAllState(
  rows: readonly ConnectorModelRow[],
  selected: ReadonlySet<string>,
): CheckedState {
  if (rows.length === 0) {
    return false;
  }
  const picked = rows.filter((row) => selected.has(row.modelKey)).length;
  if (picked === 0) {
    return false;
  }
  return picked === rows.length ? true : 'indeterminate';
}

/** Translation key for a connector lifecycle, or null for a value we do not know. */
export function resolveLifecycleLabelKey(lifecycle: string): string | null {
  const known = Object.values(ConnectorModelLifecycle).find((value) => value === lifecycle);
  return known === undefined ? null : CONNECTOR_MODEL_LIFECYCLE_LABEL_KEYS[known];
}

export function resolveLifecycleBadgeClass(lifecycle: string): string {
  const known = Object.values(ConnectorModelLifecycle).find((value) => value === lifecycle);
  return known === undefined ? '' : CONNECTOR_MODEL_LIFECYCLE_BADGE_CLASSES[known];
}

/** A short, locale-formatted date and time; null for "never seen" or a bad value. */
export function formatModelLastSeen(iso: string | null, locale: string): string | null {
  if (iso === null || iso === '') {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
      date,
    );
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Resets "Show more" whenever the filtered list changes shape. */
export function buildModelExposureListResetKey(filters: ModelExposureFilters): string {
  return [
    filters.search,
    String(filters.exposedOnly),
    filters.provider ?? '',
    filters.kind ?? '',
  ].join('|');
}

export function hasActiveModelExposureFilters(filters: ModelExposureFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.exposedOnly !== null ||
    filters.provider !== null ||
    filters.kind !== null
  );
}

/** The brand name for a provider enum (OPENROUTER -> OpenRouter); raw when unknown. */
export function resolveProviderDisplayName(provider: string): string {
  const match = Object.entries(PROVIDER_DISPLAY_NAMES).find(([key]) => key === provider);
  return match === undefined ? provider : match[1];
}

/** Everything a row needs to render, computed once per shown row. */
export function buildModelExposureRowViews(
  rows: readonly ConnectorModelRow[],
  selected: ReadonlySet<string>,
  policy: ProviderCreditPolicy,
  locale: string,
): ModelExposureRowView[] {
  return rows.map((row) => ({
    row,
    isSelected: selected.has(row.modelKey),
    isExposed: row.exposure === ConnectorModelExposure.EXPOSED,
    providerLabel: row.providerDisplayName ?? resolveProviderDisplayName(row.provider),
    billing: resolveModelBilling(row.provider, policy),
    lastSeenLabel: formatModelLastSeen(row.lastSeenAt, locale),
    lifecycleLabelKey: resolveLifecycleLabelKey(row.lifecycle),
    lifecycleBadgeClass: resolveLifecycleBadgeClass(row.lifecycle),
  }));
}
