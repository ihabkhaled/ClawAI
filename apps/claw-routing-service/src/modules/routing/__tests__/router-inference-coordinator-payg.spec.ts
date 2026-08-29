import { type PaygMeter } from '@claw/shared-entitlements';
import { PaygSurface } from '@claw/shared-types';
import { RouterErrorCode } from '../../../common/enums';
import { RouterProvider } from '../../../generated/prisma';
import { ROUTER_MAX_OUTPUT_TOKENS } from '../constants/router-adapter.constants';
import { RouterInferenceCoordinatorManager } from '../managers/router-inference-coordinator.manager';
import type {
  RouterChainEntryInput,
  RouterCoordinatorOptions,
  RouterInferenceProvider,
  RouterInferenceRequest,
  RouterInferenceResponse,
} from '../types/router-inference.types';

const ELIGIBLE = ['dep_a', 'dep_b'];
const USER_ID = 'usr_metered';

const goodAnswer = (deploymentId = 'dep_a'): string =>
  JSON.stringify({ deploymentId, workflow: 'DIRECT', confidence: 0.9, reasonCodes: ['MATCH'] });

const ok = (raw: string, inputTokens: number | null = 412, outputTokens: number | null = 88) =>
  ({ ok: true, raw, latencyMs: 10, inputTokens, outputTokens }) satisfies RouterInferenceResponse;

const fail = (code: RouterErrorCode) =>
  ({ ok: false, code, safeMessage: code, latencyMs: 5 }) satisfies RouterInferenceResponse;

const fakeProvider = (
  provider: RouterProvider,
  responses: RouterInferenceResponse[],
): { adapter: RouterInferenceProvider; requests: RouterInferenceRequest[] } => {
  const requests: RouterInferenceRequest[] = [];
  let index = 0;
  return {
    requests,
    adapter: {
      provider,
      invoke: (request) => {
        requests.push(request);
        const response = responses[Math.min(index, responses.length - 1)];
        index += 1;
        return Promise.resolve(response ?? fail(RouterErrorCode.UNKNOWN));
      },
    },
  };
};

const throwingProvider = (provider: RouterProvider, error: Error): RouterInferenceProvider => ({
  provider,
  invoke: () => Promise.reject(error),
});

const entry = (overrides: Partial<RouterChainEntryInput> = {}): RouterChainEntryInput => ({
  entryId: 'e1',
  order: 1,
  provider: RouterProvider.GEMINI,
  providerModelId: 'gemini-2.5-flash',
  deploymentId: 'dep_a',
  attemptTimeoutMs: 1_600,
  retries: 0,
  triggers: [],
  ...overrides,
});

const options = (overrides: Partial<RouterCoordinatorOptions> = {}): RouterCoordinatorOptions => ({
  traceId: 'trace-1',
  userId: USER_ID,
  prompt: 'route this message somewhere sensible',
  chain: [entry()],
  totalDeadlineMs: 5_000,
  maxAttempts: 6,
  minConfidence: 0.75,
  eligibleDeploymentIds: ELIGIBLE,
  ...overrides,
});

type MeterMock = { reserve: jest.Mock; finalize: jest.Mock; release: jest.Mock };

const meter = (maxOutputTokens = ROUTER_MAX_OUTPUT_TOKENS): MeterMock => ({
  reserve: jest.fn().mockResolvedValue({
    metered: true,
    reservationId: 'res-1',
    maxOutputTokens,
    clamped: maxOutputTokens < ROUTER_MAX_OUTPUT_TOKENS,
    heldMicroUsd: 3_500,
    availableAfterMicroUsd: 96_500,
  }),
  finalize: jest.fn().mockResolvedValue(undefined),
  release: jest.fn().mockResolvedValue(undefined),
});

const build = (payg?: MeterMock): RouterInferenceCoordinatorManager =>
  new RouterInferenceCoordinatorManager(payg as unknown as PaygMeter | undefined);

describe('RouterInferenceCoordinatorManager — PAYG metering (U5/U6)', () => {
  describe('successful paid call', () => {
    it('reserves before the provider is called and finalizes with the reported usage', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      const result = await build(payg).run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(result.ok).toBe(true);
      expect(payg.reserve).toHaveBeenCalledTimes(1);
      expect(payg.finalize).toHaveBeenCalledTimes(1);
      expect(payg.release).not.toHaveBeenCalled();

      const [, usage] = payg.finalize.mock.calls[0] as [unknown, Record<string, number>];
      expect(usage).toEqual({
        promptTokens: 412,
        completionTokens: 88,
        cachedPromptTokens: 0,
        reasoningTokens: 0,
      });
    });

    it('reserves against the ROUTING surface and the entry provider and model', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      await build(payg).run(new Map([[RouterProvider.GEMINI, gemini.adapter]]), options());

      const [request] = payg.reserve.mock.calls[0] as [Record<string, unknown>];
      expect(request).toMatchObject({
        userId: USER_ID,
        provider: RouterProvider.GEMINI,
        model: 'gemini-2.5-flash',
        surface: PaygSurface.ROUTING,
        cachedPromptTokens: 0,
        requestedMaxOutputTokens: ROUTER_MAX_OUTPUT_TOKENS,
      });
      expect(request['promptTokens']).toBeGreaterThan(0);
    });

    // A null count settles as zero rather than as the held worst case: charging
    // for tokens no provider ever confirmed is the wrong way to guess.
    it('settles an unreported token count as zero, not as the hold', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer(), null, null)]);

      await build(payg).run(new Map([[RouterProvider.GEMINI, gemini.adapter]]), options());

      const [, usage] = payg.finalize.mock.calls[0] as [unknown, Record<string, number>];
      expect(usage.promptTokens).toBe(0);
      expect(usage.completionTokens).toBe(0);
    });
  });

  describe('the affordability clamp', () => {
    // The clamp is what makes "a user cannot exceed their credit" true by
    // construction. Sending the requested ceiling instead would make it a
    // reconciliation problem again.
    it('sends the granted ceiling to the provider, never the requested one', async () => {
      const payg = meter(64);
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      await build(payg).run(new Map([[RouterProvider.GEMINI, gemini.adapter]]), options());

      expect(gemini.requests[0]?.maxOutputTokens).toBe(64);
    });

    it('passes the full ceiling through when nothing was clamped', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      await build(payg).run(new Map([[RouterProvider.GEMINI, gemini.adapter]]), options());

      expect(gemini.requests[0]?.maxOutputTokens).toBe(ROUTER_MAX_OUTPUT_TOKENS);
    });
  });

  describe('failure releases the hold', () => {
    it('releases when the provider returns a failure', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [fail(RouterErrorCode.PROVIDER_5XX)]);

      await build(payg).run(new Map([[RouterProvider.GEMINI, gemini.adapter]]), options());

      expect(payg.release).toHaveBeenCalledTimes(1);
      expect(payg.release).toHaveBeenCalledWith(expect.anything(), 'PROVIDER_ERROR');
      expect(payg.finalize).not.toHaveBeenCalled();
    });

    it('releases and rethrows when the adapter throws', async () => {
      const payg = meter();
      const adapter = throwingProvider(RouterProvider.GEMINI, new Error('socket hangup'));

      await expect(
        build(payg).run(new Map([[RouterProvider.GEMINI, adapter]]), options()),
      ).rejects.toThrow('socket hangup');

      expect(payg.release).toHaveBeenCalledWith(expect.anything(), 'PROVIDER_ERROR');
      expect(payg.finalize).not.toHaveBeenCalled();
    });

    // A malformed answer is a provider SUCCESS that failed validation. The
    // tokens were really produced and really billed upstream, so the hold is
    // settled, not returned.
    it('finalizes a malformed answer rather than releasing it', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok('not json at all')]);

      await build(payg).run(new Map([[RouterProvider.GEMINI, gemini.adapter]]), options());

      expect(payg.finalize).toHaveBeenCalled();
    });
  });

  describe('one hold per attempt', () => {
    // `reserve` is idempotent on (userId, requestId). A retry inside the entry
    // is a SECOND paid call, so sharing the key across attempts would silently
    // under-charge every retried route.
    it('uses a distinct requestId for each retry of the same entry', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        fail(RouterErrorCode.TIMEOUT),
        ok(goodAnswer()),
      ]);

      await build(payg).run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ chain: [entry({ retries: 1 })] }),
      );

      expect(payg.reserve).toHaveBeenCalledTimes(2);
      const keys = payg.reserve.mock.calls.map(
        ([request]) => (request as Record<string, string>)['requestId'],
      );
      expect(new Set(keys).size).toBe(2);
      expect(keys[0]).toContain('trace-1');
    });

    it('reserves separately for each chain entry it walks', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [fail(RouterErrorCode.MODEL_NOT_FOUND)]);
      const ollama = fakeProvider(RouterProvider.OLLAMA_CLOUD, [ok(goodAnswer())]);

      await build(payg).run(
        new Map([
          [RouterProvider.GEMINI, gemini.adapter],
          [RouterProvider.OLLAMA_CLOUD, ollama.adapter],
        ]),
        options({
          chain: [
            entry(),
            entry({ entryId: 'e2', order: 2, provider: RouterProvider.OLLAMA_CLOUD }),
          ],
        }),
      );

      expect(payg.reserve).toHaveBeenCalledTimes(2);
      expect(payg.release).toHaveBeenCalledTimes(1);
      expect(payg.finalize).toHaveBeenCalledTimes(1);
    });
  });

  describe('refusal degrades to local rather than refusing the user', () => {
    // BUDGET_EXCEEDED is REQUEST-scoped, so the walk stops and the caller
    // (`tryCloudRouting`) returns null — which drops AUTO mode to the local
    // heuristic router instead of failing the message. That is D4 exactly.
    it('stops the walk with BUDGET_EXCEEDED when the reservation is refused', async () => {
      const payg = meter();
      payg.reserve.mockRejectedValue(new Error('PAYG_CREDIT_EXHAUSTED'));
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      const result = await build(payg).run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(RouterErrorCode.BUDGET_EXCEEDED);
      }
      expect(gemini.requests).toHaveLength(0);
      expect(payg.finalize).not.toHaveBeenCalled();
      expect(payg.release).not.toHaveBeenCalled();
    });

    // FAILS CLOSED. An unreachable auth-service is not a licence to spend a
    // provider's money unbounded, so it is treated exactly like exhaustion.
    it('refuses the same way when auth-service is unreachable', async () => {
      const payg = meter();
      payg.reserve.mockRejectedValue(new Error('ECONNREFUSED'));
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      const result = await build(payg).run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(result.ok).toBe(false);
      expect(gemini.requests).toHaveLength(0);
    });
  });

  describe('unmetered paths', () => {
    // Replays and shadow evaluations run against no wallet. Charging an
    // invented id would be worse than an unmetered internal call.
    it('calls the provider unmetered when the walk carries no userId', async () => {
      const payg = meter();
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      const result = await build(payg).run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ userId: undefined }),
      );

      expect(result.ok).toBe(true);
      expect(payg.reserve).not.toHaveBeenCalled();
      expect(gemini.requests[0]?.maxOutputTokens).toBeUndefined();
    });

    // The router must keep routing when metering is not wired. A missing meter
    // degrades to an unmetered call rather than taking AUTO mode down.
    it('routes normally when no meter is injected at all', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);

      const result = await build().run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(result.ok).toBe(true);
      expect(gemini.requests).toHaveLength(1);
    });
  });
});
