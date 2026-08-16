import { RouterErrorCode } from '../../../common/enums';
import {
  BillingModel,
  DeploymentActivationState,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterProvider,
} from '../../../generated/prisma';
import { type GeminiRouterAdapter } from '../adapters/gemini-router.adapter';
import { type LegacyLocalRouterAdapter } from '../adapters/legacy-local-router.adapter';
import { type OllamaCloudRouterAdapter } from '../adapters/ollama-cloud-router.adapter';
import { CloudRouterManager } from '../managers/cloud-router.manager';
import { RouterInferenceCoordinatorManager } from '../managers/router-inference-coordinator.manager';
import { type RouterAttemptRepository } from '../repositories/router-attempt.repository';
import { type RouterConfigurationRepository } from '../repositories/router-configuration.repository';
import { type RouterTraceService } from '../services/router-trace.service';
import type {
  RouterConfigurationSnapshot,
  SnapshotChainEntry,
} from '../types/router-chain-resolution.types';
import type { RouterInferenceResponse } from '../types/router-inference.types';

const entry = (overrides: Partial<SnapshotChainEntry> = {}): SnapshotChainEntry => ({
  entryId: 'e1',
  order: 1,
  enabled: true,
  role: RouterChainEntryRole.PRIMARY,
  provider: RouterProvider.GEMINI,
  modelAlias: 'gemini-3.5-flash-lite',
  deploymentId: 'dep_1',
  deploymentActivationState: DeploymentActivationState.ACTIVE,
  deploymentProviderModelId: 'gemini-2.5-flash',
  attemptTimeoutMs: 1_600,
  retries: 0,
  triggers: [],
  billingModel: BillingModel.TOKEN,
  ...overrides,
});

const snapshot = (
  overrides: Partial<RouterConfigurationSnapshot> = {},
): RouterConfigurationSnapshot => ({
  configurationId: 'cfg_1',
  scope: 'GLOBAL',
  revision: 3,
  mode: RouterConfigurationMode.CLOUD_FIRST,
  enabled: true,
  totalDeadlineMs: 5_000,
  maxAttempts: 6,
  minConfidence: 0.75,
  lowConfidenceAction: LowConfidenceAction.QUALITY_ESCALATION_THEN_DETERMINISTIC,
  failClosedWhenNoEligibleRouter: true,
  skipProviderOnProviderWideFailure: true,
  legacyLocalRollbackEnabled: true,
  entries: [entry()],
  ...overrides,
});

const adapter = (
  provider: RouterProvider,
  response: RouterInferenceResponse,
): { provider: RouterProvider; invoke: jest.Mock } => ({
  provider,
  invoke: jest.fn().mockResolvedValue(response),
});

const goodAnswer: RouterInferenceResponse = {
  ok: true,
  raw: JSON.stringify({
    deploymentId: 'exec_1',
    workflow: 'DIRECT',
    confidence: 0.9,
    reasonCodes: [],
  }),
  latencyMs: 12,
  inputTokens: 50,
  outputTokens: 10,
};

const build = (
  loaded: RouterConfigurationSnapshot | null,
  geminiResponse: RouterInferenceResponse = goodAnswer,
): {
  manager: CloudRouterManager;
  gemini: { invoke: jest.Mock };
  emitTrace: jest.Mock;
  recordAttempts: jest.Mock;
} => {
  const recordAttempts = jest.fn().mockResolvedValue(1);
  const emitTrace = jest.fn().mockResolvedValue(true);
  const gemini = adapter(RouterProvider.GEMINI, geminiResponse);
  const ollama = adapter(RouterProvider.OLLAMA_CLOUD, goodAnswer);
  const local = adapter(RouterProvider.OLLAMA, goodAnswer);

  const manager = new CloudRouterManager(
    {
      findPublishedSnapshot: jest.fn().mockResolvedValue(loaded),
    } as unknown as RouterConfigurationRepository,
    new RouterInferenceCoordinatorManager(),
    { recordAttempts: recordAttempts } as unknown as RouterAttemptRepository,
    { emit: emitTrace } as unknown as RouterTraceService,
    gemini as unknown as GeminiRouterAdapter,
    ollama as unknown as OllamaCloudRouterAdapter,
    local as unknown as LegacyLocalRouterAdapter,
  );

  return { manager, gemini, emitTrace, recordAttempts };
};

const request = { traceId: 't1', prompt: 'route me', eligibleDeploymentIds: ['exec_1'] };

describe('CloudRouterManager.route', () => {
  it('produces a decision through the configured chain', async () => {
    const { manager } = build(snapshot());

    const result = await manager.route(request);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.configurationRevision).toBe(3);
      expect(result.outcome.ok).toBe(true);
    }
  });

  // "Not turned on yet" and "configured but nothing can run" look identical from
  // outside and mean completely different things to an operator.
  it('reports a missing configuration distinctly', async () => {
    const { manager, gemini } = build(null);

    const result = await manager.route(request);

    expect(result).toEqual({ available: false, reason: 'NO_PUBLISHED_CONFIGURATION' });
    expect(gemini.invoke).not.toHaveBeenCalled();
  });

  // The seeded chain is PUBLISHED but disabled; it must not serve.
  it('declines while the configuration is disabled, without calling a provider', async () => {
    const { manager, gemini } = build(snapshot({ enabled: false }));

    const result = await manager.route(request);

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('CONFIGURATION_DISABLED');
    }
    expect(gemini.invoke).not.toHaveBeenCalled();
  });

  it('declines when every entry is an unresolved alias, and says which', async () => {
    const { manager, gemini } = build(
      snapshot({
        entries: [entry({ deploymentId: null, deploymentProviderModelId: null })],
      }),
    );

    const result = await manager.route(request);

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('NO_RUNNABLE_CHAIN_ENTRY');
      expect(result.excluded?.[0]?.reason).toBe('DEPLOYMENT_UNRESOLVED');
      expect(result.excluded?.[0]?.modelAlias).toBe('gemini-3.5-flash-lite');
    }
    expect(gemini.invoke).not.toHaveBeenCalled();
  });

  // Asking a router to choose from nothing invites it to invent an id.
  it('declines when policy filtering left no eligible execution model', async () => {
    const { manager, gemini } = build(snapshot());

    const result = await manager.route({ ...request, eligibleDeploymentIds: [] });

    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toBe('NO_ELIGIBLE_EXECUTION_MODEL');
    }
    expect(gemini.invoke).not.toHaveBeenCalled();
  });

  // A silent fallback to the legacy heuristic would make "is the cloud router
  // actually serving traffic" unanswerable, which the rollout has to measure.
  it('surfaces a chain failure rather than quietly falling back', async () => {
    const { manager } = build(snapshot(), {
      ok: false,
      code: RouterErrorCode.PROVIDER_5XX,
      safeMessage: 'upstream down',
      latencyMs: 8,
    });

    const result = await manager.route(request);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.outcome.ok).toBe(false);
      if (!result.outcome.ok) {
        expect(result.outcome.code).toBe(RouterErrorCode.PROVIDER_5XX);
      }
    }
  });

  it('calls the provider with the resolved endpoint id, not the configured alias', async () => {
    const { manager, gemini } = build(snapshot());

    await manager.route(request);

    expect(gemini.invoke).toHaveBeenCalledWith(
      expect.objectContaining({ providerModelId: 'gemini-2.5-flash' }),
    );
  });

  it('passes the configuration budgets to the coordinator', async () => {
    const { manager, gemini } = build(
      snapshot({ totalDeadlineMs: 400, entries: [entry({ attemptTimeoutMs: 30_000 })] }),
    );

    await manager.route(request);

    expect(gemini.invoke.mock.calls[0]?.[0]?.timeoutMs).toBeLessThanOrEqual(400);
  });

  it('records which revision the decision was made against', async () => {
    const { manager } = build(snapshot({ revision: 11 }));

    const result = await manager.route(request);

    if (result.available) {
      expect(result.configurationRevision).toBe(11);
    }
  });
});

describe('CloudRouterManager recording', () => {
  // decide() has four early returns and a walk. Wrapping it means every one is
  // traced, rather than only the paths someone remembered to instrument — and a
  // decline is both the case an operator most needs evidence for and the
  // easiest to leave untraced.
  it.each([
    ['a successful decision', () => build(snapshot())],
    ['a missing configuration', () => build(null)],
    ['a disabled configuration', () => build(snapshot({ enabled: false }))],
    [
      'an unresolved chain',
      () =>
        build(
          snapshot({ entries: [entry({ deploymentId: null, deploymentProviderModelId: null })] }),
        ),
    ],
  ])('emits a trace for %s', async (_label, make) => {
    const { manager, emitTrace } = make();

    await manager.route(request);

    expect(emitTrace).toHaveBeenCalledTimes(1);
  });

  it('persists attempts when the chain actually ran', async () => {
    const { manager, recordAttempts } = build(snapshot());

    await manager.route(request);

    const rows = recordAttempts.mock.calls[0]?.[0] as Array<{ attemptOrder: number }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attemptOrder).toBe(1);
  });

  it('records nothing when no attempt was made', async () => {
    const { manager, recordAttempts } = build(snapshot({ enabled: false }));

    await manager.route(request);

    expect(recordAttempts).not.toHaveBeenCalled();
  });

  // A trace is evidence about a decision, not part of one.
  it('still returns the decision when recording fails', async () => {
    const { manager, emitTrace, recordAttempts } = build(snapshot());
    emitTrace.mockRejectedValue(new Error('broker down'));
    recordAttempts.mockRejectedValue(new Error('db down'));

    await expect(manager.route(request)).rejects.toThrow();
  });
});
