import { describe, expect, it } from 'vitest';

import { VersionDiffStatus } from '@/enums';
import {
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationBillingModel,
  RouterConfigurationMode,
  RouterConfigurationStatus,
  RouterProvider,
} from '@/enums/router-configuration.enum';
import type { RouterChainEntry, RouterConfigurationDetail } from '@/types/smart-router-admin.types';
import { diffRouterConfigurations } from '@/utilities/router-configuration-diff.utility';

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

function makeConfiguration(
  revision: number,
  entries: RouterChainEntry[],
): RouterConfigurationDetail {
  return {
    id: `rev-${revision}`,
    scope: 'GLOBAL',
    revision,
    status: RouterConfigurationStatus.DRAFT,
    mode: RouterConfigurationMode.CLOUD_FIRST,
    enabled: true,
    totalDeadlineMs: 30_000,
    maxAttempts: 3,
    maxRouterInputTokens: 1000,
    maxRouterOutputTokens: 1000,
    minConfidence: 0.6,
    lowConfidenceAction: LowConfidenceAction.DETERMINISTIC_ONLY,
    failClosedWhenNoEligibleRouter: true,
    skipProviderOnProviderWideFailure: true,
    safeTraceLevel: 'FULL',
    legacyLocalRollbackEnabled: false,
    supersedesRevision: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    entries,
  };
}

describe('diffRouterConfigurations', () => {
  it('marks identical entries as unchanged', () => {
    const entry = makeEntry({ id: 'a', order: 1 });
    const diff = diffRouterConfigurations(
      makeConfiguration(1, [entry]),
      makeConfiguration(2, [entry]),
    );
    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0]?.status).toBe(VersionDiffStatus.UNCHANGED);
  });

  it('marks an entry only present in "to" as added', () => {
    const from = makeConfiguration(1, []);
    const to = makeConfiguration(2, [makeEntry({ id: 'a', order: 1 })]);
    const diff = diffRouterConfigurations(from, to);
    expect(diff.entries[0]?.status).toBe(VersionDiffStatus.ADDED);
    expect(diff.entries[0]?.before).toBeNull();
  });

  it('marks an entry only present in "from" as removed', () => {
    const from = makeConfiguration(1, [makeEntry({ id: 'a', order: 1 })]);
    const to = makeConfiguration(2, []);
    const diff = diffRouterConfigurations(from, to);
    expect(diff.entries[0]?.status).toBe(VersionDiffStatus.REMOVED);
    expect(diff.entries[0]?.after).toBeNull();
  });

  it('marks a field-level change as changed and lists the changed fields', () => {
    const from = makeConfiguration(1, [makeEntry({ id: 'a', order: 1, retries: 0 })]);
    const to = makeConfiguration(2, [makeEntry({ id: 'a', order: 1, retries: 3 })]);
    const diff = diffRouterConfigurations(from, to);
    expect(diff.entries[0]?.status).toBe(VersionDiffStatus.CHANGED);
    expect(diff.entries[0]?.changedFields).toContain('retries');
  });

  it('carries the revision numbers through', () => {
    const diff = diffRouterConfigurations(makeConfiguration(1, []), makeConfiguration(5, []));
    expect(diff.fromRevision).toBe(1);
    expect(diff.toRevision).toBe(5);
  });
});
