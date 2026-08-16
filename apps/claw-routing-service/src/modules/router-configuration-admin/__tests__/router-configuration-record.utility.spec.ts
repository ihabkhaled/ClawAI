import {
  BillingModel,
  type RouterChainEntry,
  RouterChainEntryRole,
  type RouterConfiguration,
  RouterConfigurationMode,
  RouterConfigurationStatus,
  RouterProvider,
} from '../../../generated/prisma';
import {
  mapConfigurationDetail,
  mapConfigurationSummary,
  mapEntryRow,
} from '../utilities/router-configuration-record.utility';

const entryRow = (overrides: Partial<RouterChainEntry> = {}): RouterChainEntry => ({
  id: 'entry_1',
  configurationId: 'config_1',
  order: 1,
  enabled: true,
  role: RouterChainEntryRole.PRIMARY,
  deploymentId: null,
  modelAlias: 'gemini-2.5-flash',
  provider: RouterProvider.GEMINI,
  attemptTimeoutMs: 1600,
  retries: 0,
  triggers: ['LOW_CONFIDENCE'],
  skipWhenProviderCircuitOpen: true,
  minConfidence: null,
  maxCostMicroUsd: null,
  billingModel: BillingModel.UNKNOWN,
  lastValidatedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const configRow = (
  overrides: Partial<RouterConfiguration> = {},
  entries: RouterChainEntry[] = [],
): RouterConfiguration & { entries: RouterChainEntry[] } => ({
  id: 'config_1',
  scope: 'GLOBAL',
  revision: 1,
  status: RouterConfigurationStatus.DRAFT,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: false,
  totalDeadlineMs: 5000,
  maxAttempts: 6,
  maxRouterInputTokens: 1800,
  maxRouterOutputTokens: 320,
  minConfidence: { toString: () => '0.75', valueOf: () => 0.75 } as never,
  lowConfidenceAction: 'QUALITY_ESCALATION_THEN_DETERMINISTIC' as never,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  safeTraceLevel: 'DETAILED_FACTORS',
  legacyLocalRollbackEnabled: true,
  supersedesRevision: null,
  publishedAt: null,
  publishedBy: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  entries,
  ...overrides,
});

describe('mapEntryRow', () => {
  it('converts a Decimal minConfidence to a number', () => {
    const row = entryRow({ minConfidence: { toString: () => '0.9', valueOf: () => 0.9 } as never });
    expect(mapEntryRow(row).minConfidence).toBe(0.9);
  });

  it('passes through a null minConfidence', () => {
    expect(mapEntryRow(entryRow({ minConfidence: null })).minConfidence).toBeNull();
  });

  it('serializes a BigInt maxCostMicroUsd to a decimal string', () => {
    const row = entryRow({ maxCostMicroUsd: 5_000_000n });
    expect(mapEntryRow(row).maxCostMicroUsd).toBe('5000000');
  });

  it('passes through a null maxCostMicroUsd', () => {
    expect(mapEntryRow(entryRow({ maxCostMicroUsd: null })).maxCostMicroUsd).toBeNull();
  });
});

describe('mapConfigurationSummary', () => {
  it('reports entryCount without including the entries themselves', () => {
    const summary = mapConfigurationSummary(configRow({}, [entryRow(), entryRow({ id: 'e2' })]));
    expect(summary.entryCount).toBe(2);
    expect(summary).not.toHaveProperty('entries');
  });

  it('converts the Decimal minConfidence to a number', () => {
    const summary = mapConfigurationSummary(configRow());
    expect(summary.minConfidence).toBe(0.75);
  });
});

describe('mapConfigurationDetail', () => {
  it('sorts entries by order regardless of row order', () => {
    const detail = mapConfigurationDetail(
      configRow({}, [entryRow({ id: 'e2', order: 2 }), entryRow({ id: 'e1', order: 1 })]),
    );
    expect(detail.entries.map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('omits entryCount in favor of the entries array', () => {
    const detail = mapConfigurationDetail(configRow({}, [entryRow()]));
    expect(detail).not.toHaveProperty('entryCount');
    expect(detail.entries).toHaveLength(1);
  });
});
