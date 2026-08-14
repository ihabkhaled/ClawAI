import {
  BillingModel,
  DeploymentActivationState,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterProvider,
} from '../../../generated/prisma';
import type {
  RouterConfigurationSnapshot,
  SnapshotChainEntry,
} from '../types/router-chain-resolution.types';
import {
  isChainServiceable,
  resolveChain,
  resolveEscalationEntry,
} from '../utilities/router-chain-resolution.utility';

const ALL_PROVIDERS = new Set([RouterProvider.GEMINI, RouterProvider.OLLAMA_CLOUD]);

const chainEntry = (overrides: Partial<SnapshotChainEntry> = {}): SnapshotChainEntry => ({
  entryId: 'e1',
  order: 1,
  enabled: true,
  role: RouterChainEntryRole.PRIMARY,
  provider: RouterProvider.GEMINI,
  modelAlias: 'gemini-3.5-flash-lite',
  deploymentId: 'dep_1',
  deploymentActivationState: DeploymentActivationState.ACTIVE,
  deploymentProviderModelId: 'gemini-3.5-flash-lite',
  attemptTimeoutMs: 1_600,
  retries: 1,
  triggers: [],
  billingModel: BillingModel.TOKEN,
  ...overrides,
});

const snapshot = (
  entries: SnapshotChainEntry[],
  overrides: Partial<RouterConfigurationSnapshot> = {},
): RouterConfigurationSnapshot => ({
  configurationId: 'cfg_1',
  scope: 'GLOBAL',
  revision: 1,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: true,
  totalDeadlineMs: 5_000,
  maxAttempts: 6,
  minConfidence: 0.75,
  lowConfidenceAction: LowConfidenceAction.QUALITY_ESCALATION_THEN_DETERMINISTIC,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  legacyLocalRollbackEnabled: true,
  entries,
  ...overrides,
});

describe('resolveChain', () => {
  it('returns a runnable entry in order', () => {
    const result = resolveChain(
      snapshot([chainEntry({ entryId: 'b', order: 2 }), chainEntry({ entryId: 'a', order: 1 })]),
      ALL_PROVIDERS,
    );

    expect(result.runnable.map((e) => e.entryId)).toEqual(['a', 'b']);
    expect(result.excluded).toHaveLength(0);
  });

  // A freshly seeded chain is entirely unresolved aliases. That is the expected
  // state, not an error — and specifically not something to guess past.
  it('excludes a seeded entry whose alias has no deployment yet', () => {
    const result = resolveChain(
      snapshot([chainEntry({ deploymentId: null, deploymentProviderModelId: null })]),
      ALL_PROVIDERS,
    );

    expect(result.runnable).toHaveLength(0);
    expect(result.excluded[0]?.reason).toBe('DEPLOYMENT_UNRESOLVED');
  });

  it.each([
    DeploymentActivationState.REQUIRES_VALIDATION,
    DeploymentActivationState.QUARANTINED,
    DeploymentActivationState.UNHEALTHY,
    DeploymentActivationState.DISABLED,
    DeploymentActivationState.RETIRED,
  ])('excludes a deployment in state %s', (state) => {
    const result = resolveChain(
      snapshot([chainEntry({ deploymentActivationState: state })]),
      ALL_PROVIDERS,
    );

    expect(result.runnable).toHaveLength(0);
    expect(result.excluded[0]?.reason).toBe('DEPLOYMENT_NOT_ACTIVE');
  });

  it('excludes a disabled entry', () => {
    const result = resolveChain(snapshot([chainEntry({ enabled: false })]), ALL_PROVIDERS);
    expect(result.excluded[0]?.reason).toBe('ENTRY_DISABLED');
  });

  it('excludes an entry whose provider has no adapter', () => {
    const result = resolveChain(snapshot([chainEntry()]), new Set([RouterProvider.OLLAMA_CLOUD]));
    expect(result.excluded[0]?.reason).toBe('NO_ADAPTER_FOR_PROVIDER');
  });

  // Escalation answers a confidence verdict, not chain position. Reaching it by
  // ordinary fallback would spend the escalation model's budget on failures it
  // was never meant to handle.
  it('keeps quality escalation out of the ordinary walk', () => {
    const result = resolveChain(
      snapshot([
        chainEntry({ entryId: 'primary', order: 1 }),
        chainEntry({
          entryId: 'escalation',
          order: 7,
          role: RouterChainEntryRole.QUALITY_ESCALATION,
        }),
      ]),
      ALL_PROVIDERS,
    );

    expect(result.runnable.map((e) => e.entryId)).toEqual(['primary']);
    expect(result.excluded[0]?.reason).toBe('ESCALATION_ONLY');
  });

  // An operator seeing a chain that produced nothing needs to know four of six
  // entries were unresolved, not just that the list was empty.
  it('records a reason for every excluded entry', () => {
    const result = resolveChain(
      snapshot([
        chainEntry({ entryId: 'ok', order: 1 }),
        chainEntry({ entryId: 'off', order: 2, enabled: false }),
        chainEntry({
          entryId: 'unresolved',
          order: 3,
          deploymentId: null,
          deploymentProviderModelId: null,
        }),
      ]),
      ALL_PROVIDERS,
    );

    expect(result.runnable).toHaveLength(1);
    expect(result.excluded.map((e) => e.reason)).toEqual([
      'ENTRY_DISABLED',
      'DEPLOYMENT_UNRESOLVED',
    ]);
    for (const entry of result.excluded) {
      expect(entry.modelAlias.length).toBeGreaterThan(0);
    }
  });

  it('carries the resolved provider model id rather than the alias', () => {
    const result = resolveChain(
      snapshot([
        chainEntry({
          modelAlias: 'glm-4.7:cloud',
          provider: RouterProvider.OLLAMA_CLOUD,
          deploymentProviderModelId: 'glm-5.2:cloud',
        }),
      ]),
      ALL_PROVIDERS,
    );

    expect(result.runnable[0]?.providerModelId).toBe('glm-5.2:cloud');
  });

  it('handles an empty chain without throwing', () => {
    const result = resolveChain(snapshot([]), ALL_PROVIDERS);
    expect(result).toEqual({ runnable: [], excluded: [] });
  });
});

describe('resolveEscalationEntry', () => {
  it('returns the escalation entry when it is runnable', () => {
    const entry = resolveEscalationEntry(
      snapshot([
        chainEntry({ entryId: 'primary', order: 1 }),
        chainEntry({
          entryId: 'escalation',
          order: 7,
          role: RouterChainEntryRole.QUALITY_ESCALATION,
        }),
      ]),
      ALL_PROVIDERS,
    );

    expect(entry?.entryId).toBe('escalation');
  });

  it('returns null when the escalation entry is unresolved', () => {
    const entry = resolveEscalationEntry(
      snapshot([
        chainEntry({
          role: RouterChainEntryRole.QUALITY_ESCALATION,
          deploymentId: null,
          deploymentProviderModelId: null,
        }),
      ]),
      ALL_PROVIDERS,
    );

    expect(entry).toBeNull();
  });

  it('returns null when there is no escalation entry at all', () => {
    expect(resolveEscalationEntry(snapshot([chainEntry()]), ALL_PROVIDERS)).toBeNull();
  });
});

describe('isChainServiceable', () => {
  // The seeded chain is PUBLISHED but disabled. It must not serve until an
  // admin turns it on.
  it('is not serviceable while the configuration is disabled', () => {
    const disabled = snapshot([chainEntry()], { enabled: false });
    expect(isChainServiceable(disabled, resolveChain(disabled, ALL_PROVIDERS))).toBe(false);
  });

  it('is not serviceable when every entry is excluded', () => {
    const unresolved = snapshot([
      chainEntry({ deploymentId: null, deploymentProviderModelId: null }),
    ]);
    expect(isChainServiceable(unresolved, resolveChain(unresolved, ALL_PROVIDERS))).toBe(false);
  });

  it('is serviceable when enabled with at least one runnable entry', () => {
    const ready = snapshot([chainEntry()]);
    expect(isChainServiceable(ready, resolveChain(ready, ALL_PROVIDERS))).toBe(true);
  });
});
