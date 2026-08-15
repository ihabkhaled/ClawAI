import { describe, expect, it } from 'vitest';

import {
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import type { RouterChainEntry } from '@/types/smart-router-admin.types';
import {
  buildEntriesWithAppendedEntry,
  buildEntriesWithoutEntry,
  buildReorderedEntries,
  toChainEntryInput,
} from '@/utilities/router-configuration-entry.utility';

function makeEntry(overrides: Partial<RouterChainEntry>): RouterChainEntry {
  return {
    id: 'e1',
    order: 1,
    enabled: true,
    role: RouterChainEntryRole.PRIMARY,
    deploymentId: null,
    modelAlias: 'claude-sonnet-4-5',
    provider: RouterProvider.ANTHROPIC,
    attemptTimeoutMs: 1600,
    retries: 0,
    triggers: [],
    skipWhenProviderCircuitOpen: true,
    minConfidence: null,
    maxCostMicroUsd: null,
    billingModel: RouterConfigurationBillingModel.UNKNOWN,
    lastValidatedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('toChainEntryInput', () => {
  it('drops server-owned fields and converts maxCostMicroUsd back to a number', () => {
    const input = toChainEntryInput(makeEntry({ maxCostMicroUsd: '500000', minConfidence: 0.5 }));
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('order');
    expect(input.maxCostMicroUsd).toBe(500000);
    expect(input.minConfidence).toBe(0.5);
  });

  it('maps null optional fields to undefined', () => {
    const input = toChainEntryInput(makeEntry({ deploymentId: null, maxCostMicroUsd: null }));
    expect(input.deploymentId).toBeUndefined();
    expect(input.maxCostMicroUsd).toBeUndefined();
  });
});

describe('buildReorderedEntries', () => {
  it('moves the source entry to the target order and renumbers by position', () => {
    const entries = [
      makeEntry({ id: 'a', order: 1, modelAlias: 'a' }),
      makeEntry({ id: 'b', order: 2, modelAlias: 'b' }),
      makeEntry({ id: 'c', order: 3, modelAlias: 'c' }),
    ];
    const result = buildReorderedEntries(entries, 'c', 1);
    expect(result.map((entry) => entry.modelAlias)).toEqual(['c', 'a', 'b']);
  });

  it('is a no-op when the entry is dropped on itself', () => {
    const entries = [makeEntry({ id: 'a', order: 1 }), makeEntry({ id: 'b', order: 2 })];
    const result = buildReorderedEntries(entries, 'a', 1);
    expect(result.map((entry) => entry.modelAlias)).toEqual(
      entries.map((entry) => entry.modelAlias),
    );
  });
});

describe('buildEntriesWithoutEntry', () => {
  it('removes the matching entry and keeps the rest in order', () => {
    const entries = [
      makeEntry({ id: 'a', order: 1, modelAlias: 'a' }),
      makeEntry({ id: 'b', order: 2, modelAlias: 'b' }),
    ];
    const result = buildEntriesWithoutEntry(entries, 'a');
    expect(result).toHaveLength(1);
    expect(result[0]?.modelAlias).toBe('b');
  });
});

describe('buildEntriesWithAppendedEntry', () => {
  it('appends the new entry after the existing ones', () => {
    const entries = [makeEntry({ id: 'a', order: 1, modelAlias: 'a' })];
    const newInput = toChainEntryInput(makeEntry({ id: 'new', order: 99, modelAlias: 'new' }));
    const result = buildEntriesWithAppendedEntry(entries, newInput);
    expect(result.map((entry) => entry.modelAlias)).toEqual(['a', 'new']);
  });
});
