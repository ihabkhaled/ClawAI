import { BadRequestException } from '@nestjs/common';

import { EMPTY_EXPLORER_SUMS_ROW } from '../../constants/admin-usage-explorer.constants';
import { UsageCostKind, UsageLeaderboardDimension } from '../../enums/usage-cost-kind.enum';
import { type ExplorerGroupRow } from '../../types/admin-usage-explorer.types';
import { normalizeProviderKey, providerLabel } from '../provider-label.utility';
import { groupCostKind, toCostSummary } from '../usage-cost-kind.utility';
import { decodeCursor, encodeCursor } from '../usage-cursor.utility';
import { toGroupRow, toMetrics, toRequestRow } from '../usage-explorer-mapper.utility';

describe('provider labels', () => {
  it('maps local-ollama, LOCAL_OLLAMA and CLAW to one display label each', () => {
    expect(normalizeProviderKey('local-ollama')).toBe('LOCAL_OLLAMA');
    expect(providerLabel('local-ollama')).toBe('Local Ollama');
    expect(providerLabel('LOCAL_OLLAMA')).toBe('Local Ollama');
    expect(providerLabel('CLAW')).toBe('ClawAI (platform)');
  });

  it('title-cases an unknown provider and survives blanks', () => {
    expect(providerLabel('some-new_provider')).toBe('Some New Provider');
    expect(normalizeProviderKey('')).toBe('UNKNOWN');
    expect(providerLabel(null)).toBe('Unknown');
  });
});

describe('cursor', () => {
  it('round-trips', () => {
    expect(decodeCursor(encodeCursor('12.5', 'abc'))).toEqual({ v: '12.5', id: 'abc' });
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('rejects garbage and non-numeric sort values (they are cast in SQL)', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(BadRequestException);
    const injected = Buffer.from(JSON.stringify({ v: '1; DROP TABLE x', id: 'a' })).toString(
      'base64url',
    );
    expect(() => decodeCursor(injected)).toThrow(BadRequestException);
  });
});

describe('cost kind', () => {
  const zero = { priced: 0, fallback: 0, unpriced: 0, unmetered: 0 };

  it('never calls a missing price a plain zero', () => {
    expect(groupCostKind({ ...zero, unpriced: 3 })).toBe(UsageCostKind.UNPRICED);
    expect(groupCostKind({ ...zero, unmetered: 2 })).toBe(UsageCostKind.UNMETERED);
    expect(groupCostKind({ ...zero, priced: 1, fallback: 1 })).toBe(UsageCostKind.FALLBACK);
    expect(groupCostKind({ ...zero, priced: 4 })).toBe(UsageCostKind.PRICED);
  });

  it('adds actual and estimate as integers and flags a partial figure', () => {
    const cost = toCostSummary({
      actualMicroUsd: '9007199254740993',
      estimatedMicroUsd: '7',
      priced: 2,
      fallback: 0,
      unpriced: 1,
      unmetered: 0,
    });
    expect(cost.costMicroUsd).toBe('9007199254741000');
    expect(cost.partial).toBe(true);
    expect(cost.unpricedRequests).toBe(1);
  });

  it('is not partial when nothing is priced at all', () => {
    const cost = toCostSummary({
      actualMicroUsd: '0',
      estimatedMicroUsd: '0',
      priced: 0,
      fallback: 0,
      unpriced: 2,
      unmetered: 0,
    });
    expect(cost.partial).toBe(false);
  });
});

describe('mappers', () => {
  const group: ExplorerGroupRow = {
    ...EMPTY_EXPLORER_SUMS_ROW,
    group_key: 'LOCAL_OLLAMA/llama3',
    sort_val: '1',
    email: null,
    username: null,
    role: null,
    raw_provider: 'local-ollama',
    model: 'llama3',
    requests: 2,
    input_tokens: 10n,
  };

  it('normalises the provider on a model row and returns zeros for an empty aggregate', () => {
    const row = toGroupRow(group, UsageLeaderboardDimension.MODEL);
    expect(row.providerLabel).toBe('Local Ollama');
    expect(row.model).toBe('llama3');
    expect(row.inputTokens).toBe(10);
    expect(toMetrics(undefined).cost.costKind).toBe(UsageCostKind.PRICED);
  });

  it('carries the full email on a user row', () => {
    const row = toGroupRow(
      { ...group, group_key: 'u1', email: 'jane.doe@example.com', username: 'jane' },
      UsageLeaderboardDimension.USER,
    );
    expect(row.email).toBe('jane.doe@example.com');
    expect(row.userId).toBe('u1');
  });

  it('exposes only safe request fields', () => {
    const row = toRequestRow({
      id: 'r1',
      created_at: new Date('2026-10-05T00:00:00Z'),
      provider: 'CLAW',
      model: 'm',
      workflow: null,
      state: 'FINALIZED',
      input_tokens: 1,
      output_tokens: 2,
      cached_tokens: 0,
      cache_write_tokens: 0,
      reasoning_tokens: 0,
      weighted_tokens: 3,
      tool_call_count: 0,
      cost_micro_usd: '0',
      cost_kind: 'weird',
      billing: 'weird',
      sort_val: '1',
    });
    expect(row.workflow).toBe('UNKNOWN');
    expect(row.costKind).toBe(UsageCostKind.UNPRICED);
    expect(Object.keys(row)).not.toEqual(expect.arrayContaining(['prompt', 'response', 'apiKey']));
  });
});
