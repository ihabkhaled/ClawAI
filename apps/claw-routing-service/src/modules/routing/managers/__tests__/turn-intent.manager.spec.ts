import { describe, expect, it, type Mock, vi } from 'vitest';
import { RouterErrorCode } from '../../../../common/enums';
import {
  BillingModel,
  DeploymentActivationState,
  LowConfidenceAction,
  RouterChainEntryRole,
  RouterConfigurationMode,
  RouterProvider,
} from '../../../../generated/prisma';
import type { GeminiRouterAdapter } from '../../adapters/gemini-router.adapter';
import type { LegacyLocalRouterAdapter } from '../../adapters/legacy-local-router.adapter';
import type { OllamaCloudRouterAdapter } from '../../adapters/ollama-cloud-router.adapter';
import { TURN_INTENT_DEADLINE_MS } from '../../constants/turn-intent.constants';
import type { RouterConfigurationRepository } from '../../repositories/router-configuration.repository';
import type { RouterConfigurationSnapshot } from '../../types/router-chain-resolution.types';
import type { RouterInferenceResponse } from '../../types/router-inference.types';
import { RouterInferenceCoordinatorManager } from '../router-inference-coordinator.manager';
import { TurnIntentManager } from '../turn-intent.manager';

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
  entries: [
    {
      entryId: 'e1',
      order: 1,
      enabled: true,
      role: RouterChainEntryRole.PRIMARY,
      provider: RouterProvider.GEMINI,
      modelAlias: 'gemini-flash-lite',
      deploymentId: 'dep_1',
      deploymentActivationState: DeploymentActivationState.ACTIVE,
      deploymentProviderModelId: 'gemini-2.5-flash',
      attemptTimeoutMs: 1_600,
      retries: 0,
      triggers: [],
      billingModel: BillingModel.TOKEN,
    },
  ],
  ...overrides,
});

const ok = (raw: string): RouterInferenceResponse => ({
  ok: true,
  raw,
  latencyMs: 10,
  inputTokens: 40,
  outputTokens: 8,
});

const answer = (intent: string, confidence = 0.9, fileFormat: string | null = null): string =>
  JSON.stringify({ intent, fileFormat, confidence });

const build = (
  responses: RouterInferenceResponse[],
  configured: RouterConfigurationSnapshot | null = snapshot(),
): {
  manager: TurnIntentManager;
  invoke: Mock;
  findPublishedSnapshot: Mock;
  coordinator: RouterInferenceCoordinatorManager;
} => {
  let index = 0;
  const invoke = vi.fn(() => {
    const response = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return Promise.resolve(response);
  });
  const findPublishedSnapshot = vi.fn().mockResolvedValue(configured);
  const coordinator = new RouterInferenceCoordinatorManager();
  const unused = { provider: RouterProvider.OLLAMA_CLOUD, invoke: vi.fn() };
  const manager = new TurnIntentManager(
    { findPublishedSnapshot } as unknown as RouterConfigurationRepository,
    coordinator,
    { provider: RouterProvider.GEMINI, invoke } as unknown as GeminiRouterAdapter,
    unused as unknown as OllamaCloudRouterAdapter,
    {
      provider: RouterProvider.OLLAMA,
      invoke: vi.fn(),
    } as unknown as LegacyLocalRouterAdapter,
  );
  return { manager, invoke, findPublishedSnapshot, coordinator };
};

describe('TurnIntentManager', () => {
  it('parses a valid answer', async () => {
    const { manager } = build([ok(answer('FILE', 0.92, 'pdf'))]);
    const result = await manager.classify({ message: 'make this a pdf', userId: 'u1' });
    expect(result).toEqual({ intent: 'FILE', fileFormat: 'pdf', confidence: 0.92 });
  });

  it('repairs one malformed answer, then trusts the fix', async () => {
    const { manager, invoke } = build([ok('not json at all'), ok(answer('TEXT'))]);
    const result = await manager.classify({ message: 'rewrite it normally' });
    expect(result?.intent).toBe('TEXT');
    const second = invoke.mock.calls[1] as unknown as [{ repairHint?: string }];
    expect(second[0].repairHint).toContain('"intent"');
  });

  it('returns null when the answer stays malformed after the repair', async () => {
    const { manager } = build([ok('{"intent":"POEM","confidence":0.9}')]);
    expect(await manager.classify({ message: 'hello' })).toBeNull();
  });

  it('returns null when the configuration is missing or disabled', async () => {
    expect(await build([ok(answer('TEXT'))], null).manager.classify({ message: 'a' })).toBeNull();
    const disabled = build([ok(answer('TEXT'))], snapshot({ enabled: false }));
    expect(await disabled.manager.classify({ message: 'a' })).toBeNull();
    expect(disabled.invoke).not.toHaveBeenCalled();
  });

  it('returns null on a timeout', async () => {
    const { manager } = build([
      { ok: false, code: RouterErrorCode.TIMEOUT, safeMessage: 'timeout', latencyMs: 2_500 },
    ]);
    expect(await manager.classify({ message: 'hello' })).toBeNull();
  });

  it('returns null, never throws, when the configuration read throws', async () => {
    const { manager, findPublishedSnapshot } = build([ok(answer('TEXT'))]);
    findPublishedSnapshot.mockRejectedValue(new Error('db down'));
    await expect(manager.classify({ message: 'hello' })).resolves.toBeNull();
  });

  it('uses the short deadline, never above the snapshot budget', async () => {
    const { manager, coordinator } = build([ok(answer('TEXT'))]);
    const spy = vi.spyOn(coordinator, 'runValidated');
    await manager.classify({ message: 'hello', userId: 'u1' });
    const options = spy.mock.calls[0]?.[1];
    expect(options?.totalDeadlineMs).toBe(TURN_INTENT_DEADLINE_MS);
    // Metered like a router call: the sender's wallet travels.
    expect(options?.userId).toBe('u1');

    const tight = build([ok(answer('TEXT'))], snapshot({ totalDeadlineMs: 900 }));
    const tightSpy = vi.spyOn(tight.coordinator, 'runValidated');
    await tight.manager.classify({ message: 'hello' });
    expect(tightSpy.mock.calls[0]?.[1].totalDeadlineMs).toBe(900);
  });

  it('sends a long message as head + tail with an omitted marker', async () => {
    const { manager, invoke } = build([ok(answer('TEXT'))]);
    const message = `${'H'.repeat(2_000)}${'M'.repeat(5_000)}${'T'.repeat(2_000)}`;
    await manager.classify({ message, previousTurnKind: 'FILE' });
    const request = (invoke.mock.calls[0] as unknown as [{ prompt: string }])[0];
    expect(request.prompt).toContain('[... 6000 characters omitted ...]');
    expect(request.prompt).not.toContain('MMMM');
    expect(request.prompt).toContain('PREVIOUS_ASSISTANT_TURN_KIND: FILE');
  });

  it('caches the same turn: the second ask makes no provider call', async () => {
    const { manager, invoke } = build([ok(answer('IMAGE_GENERATE'))]);
    const request = { message: 'ارسم قطة', userId: 'u1', threadId: 't1' };
    await manager.classify(request);
    const again = await manager.classify(request);
    expect(again?.intent).toBe('IMAGE_GENERATE');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('a cached entry expires after the TTL', async () => {
    const { manager, invoke } = build([ok(answer('TEXT'))]);
    let clock = 1_000;
    await manager.classify({ message: 'hello' }, () => clock);
    clock += 61_000;
    await manager.classify({ message: 'hello' }, () => clock);
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
