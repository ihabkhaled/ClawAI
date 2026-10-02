import { describe, expect, it } from 'vitest';

import { MODEL_EXPOSURE_BATCH_SIZE } from '@/constants';
import { ConnectorProvider } from '@/enums';
import { ConnectorModelExposure } from '@/enums/connector-model-exposure.enum';
import { ConnectorModelKind } from '@/enums/connector-model-kind.enum';
import { ModelBillingMode } from '@/enums/model-billing.enum';
import { ModelExposureFilterOption } from '@/enums/model-exposure-filter.enum';
import type { ConnectorModelRow } from '@/types/model-exposure.types';

import { buildProviderCreditPolicy } from '../model-billing.utility';
import {
  buildModelExposureListResetKey,
  buildModelExposureRowViews,
  chunkModelKeys,
  formatModelLastSeen,
  fromModelExposureFilterOption,
  hasActiveModelExposureFilters,
  removeKeys,
  resolveLifecycleLabelKey,
  resolveProviderDisplayName,
  resolveSelectAllState,
  toModelExposureFilterOption,
} from '../model-exposure.utility';

describe('chunkModelKeys', () => {
  it('returns nothing for an empty selection', () => {
    expect(chunkModelKeys([])).toEqual([]);
  });

  it('returns a single batch when the selection fits under the cap', () => {
    const keys = Array.from({ length: 5 }, (_, i) => `model-${String(i)}`);

    expect(chunkModelKeys(keys)).toEqual([keys]);
  });

  it('splits a selection larger than the cap into batches at the boundary', () => {
    const keys = Array.from(
      { length: MODEL_EXPOSURE_BATCH_SIZE + 1 },
      (_, i) => `model-${String(i)}`,
    );

    const batches = chunkModelKeys(keys);

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(MODEL_EXPOSURE_BATCH_SIZE);
    expect(batches[1]).toEqual(['model-200']);
  });

  it('handles the exact reported failure: 447 selected models', () => {
    const keys = Array.from({ length: 447 }, (_, i) => `openrouter/model-${String(i)}`);

    const batches = chunkModelKeys(keys);

    expect(batches.map((b) => b.length)).toEqual([200, 200, 47]);
    expect(batches.flat()).toEqual(keys);
  });
});

describe('model exposure view helpers', () => {
  const row = (overrides: Partial<ConnectorModelRow>): ConnectorModelRow => ({
    id: 'id',
    connectorId: 'c1',
    provider: 'OPENROUTER',
    modelKey: 'openrouter/a',
    displayName: 'A',
    lifecycle: 'ACTIVE',
    exposure: ConnectorModelExposure.UNEXPOSED,
    kind: ConnectorModelKind.CHAT,
    maxContextTokens: null,
    usageTier: 'STANDARD',
    syncedAt: '2026-09-25T11:30:44.256Z',
    lastSeenAt: '2026-09-25T11:30:44.256Z',
    supportsStreaming: true,
    supportsTools: false,
    supportsStructuredOutput: false,
    supportsVision: false,
    supportsAudio: false,
    ...overrides,
  });

  it('removes applied keys from a selection without mutating it', () => {
    const selected = new Set(['a', 'b', 'c']);

    expect([...removeKeys(selected, ['b'])]).toEqual(['a', 'c']);
    expect(selected.size).toBe(3);
  });

  it('round-trips the exposure filter between the Select value and the boolean', () => {
    expect(toModelExposureFilterOption(null)).toBe(ModelExposureFilterOption.ALL);
    expect(toModelExposureFilterOption(true)).toBe(ModelExposureFilterOption.EXPOSED);
    expect(toModelExposureFilterOption(false)).toBe(ModelExposureFilterOption.UNEXPOSED);
    expect(fromModelExposureFilterOption(ModelExposureFilterOption.EXPOSED)).toBe(true);
    expect(fromModelExposureFilterOption(ModelExposureFilterOption.UNEXPOSED)).toBe(false);
    expect(fromModelExposureFilterOption(ModelExposureFilterOption.ALL)).toBeNull();
  });

  it('computes the header checkbox state', () => {
    const rows = [row({ modelKey: 'a' }), row({ modelKey: 'b' })];

    expect(resolveSelectAllState([], new Set())).toBe(false);
    expect(resolveSelectAllState(rows, new Set())).toBe(false);
    expect(resolveSelectAllState(rows, new Set(['a']))).toBe('indeterminate');
    expect(resolveSelectAllState(rows, new Set(['a', 'b']))).toBe(true);
  });

  it('translates known lifecycles and leaves unknown ones raw', () => {
    expect(resolveLifecycleLabelKey('ACTIVE')).toBe('adminConnectors.exposureUi.lifecycleActive');
    expect(resolveLifecycleLabelKey('SUNSET')).toBe('adminConnectors.exposureUi.lifecycleSunset');
    expect(resolveLifecycleLabelKey('MYSTERY')).toBeNull();
  });

  it('formats last seen for the locale instead of printing the raw ISO string', () => {
    const label = formatModelLastSeen('2026-09-25T11:30:44.256Z', 'en');

    expect(label).not.toBeNull();
    expect(label).not.toContain('T11:30:44');
    expect(label).toContain('2026');
    expect(formatModelLastSeen(null, 'en')).toBeNull();
    expect(formatModelLastSeen('not a date', 'en')).toBeNull();
  });

  it('names providers by brand and keeps unknown ones raw', () => {
    expect(resolveProviderDisplayName('OPENAI')).toBe('OpenAI');
    expect(resolveProviderDisplayName('NOT_A_PROVIDER')).toBe('NOT_A_PROVIDER');
  });

  it('reports active filters and builds a reset key that changes with them', () => {
    const base = { search: '', provider: null, exposedOnly: null, kind: null };

    expect(hasActiveModelExposureFilters(base)).toBe(false);
    expect(hasActiveModelExposureFilters({ ...base, exposedOnly: true })).toBe(true);
    expect(hasActiveModelExposureFilters({ ...base, search: ' gpt ' })).toBe(true);
    expect(buildModelExposureListResetKey(base)).not.toBe(
      buildModelExposureListResetKey({ ...base, search: 'x' }),
    );
  });

  it('builds row views with billing from the connector policy', () => {
    const policy = buildProviderCreditPolicy([
      { id: 'c1', provider: ConnectorProvider.OPENROUTER, isEnabled: true, isPayAsYouGo: true },
    ]);
    const views = buildModelExposureRowViews(
      [row({ exposure: ConnectorModelExposure.EXPOSED })],
      new Set(['openrouter/a']),
      policy,
      'en',
    );

    expect(views[0]?.isSelected).toBe(true);
    expect(views[0]?.isExposed).toBe(true);
    expect(views[0]?.billing.mode).toBe(ModelBillingMode.CREDIT);
    expect(views[0]?.billing.connectorId).toBe('c1');
    expect(views[0]?.lifecycleLabelKey).toBe('adminConnectors.exposureUi.lifecycleActive');
  });
});
