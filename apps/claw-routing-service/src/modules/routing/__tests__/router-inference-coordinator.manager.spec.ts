import { RouterErrorCode } from '../../../common/enums';
import { RouterProvider } from '../../../generated/prisma';
import { RouterInferenceCoordinatorManager } from '../managers/router-inference-coordinator.manager';
import type {
  RouterChainEntryInput,
  RouterCoordinatorOptions,
  RouterInferenceProvider,
  RouterInferenceRequest,
  RouterInferenceResponse,
} from '../types/router-inference.types';

const ELIGIBLE = ['dep_a', 'dep_b', 'dep_c'];

const goodAnswer = (deploymentId = 'dep_a', confidence = 0.9): string =>
  JSON.stringify({ deploymentId, workflow: 'DIRECT', confidence, reasonCodes: ['DOMAIN_MATCH'] });

const ok = (raw: string): RouterInferenceResponse => ({
  ok: true,
  raw,
  latencyMs: 10,
  inputTokens: 100,
  outputTokens: 20,
});

const fail = (code: RouterErrorCode): RouterInferenceResponse => ({
  ok: false,
  code,
  safeMessage: code,
  latencyMs: 5,
});

/** Records every request so ordering and repair hints are assertable. */
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

const entry = (overrides: Partial<RouterChainEntryInput> = {}): RouterChainEntryInput => ({
  entryId: 'e1',
  order: 1,
  provider: RouterProvider.GEMINI,
  providerModelId: 'gemini-2.5-flash',
  deploymentId: 'dep_a',
  attemptTimeoutMs: 1_600,
  retries: 0,
  ...overrides,
});

const options = (overrides: Partial<RouterCoordinatorOptions> = {}): RouterCoordinatorOptions => ({
  traceId: 'trace-1',
  prompt: 'route this',
  chain: [entry()],
  totalDeadlineMs: 5_000,
  maxAttempts: 6,
  minConfidence: 0.75,
  eligibleDeploymentIds: ELIGIBLE,
  ...overrides,
});

describe('RouterInferenceCoordinatorManager', () => {
  let coordinator: RouterInferenceCoordinatorManager;

  beforeEach(() => {
    coordinator = new RouterInferenceCoordinatorManager();
  });

  describe('happy path', () => {
    it('returns the first valid decision', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);
      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.decision.deploymentId).toBe('dep_a');
        expect(result.fallbackDepth).toBe(0);
        expect(result.attempts).toHaveLength(1);
        expect(result.attempts[0]?.outcome).toBe('SUCCESS');
      }
    });

    it('walks entries in configured order, not array order', async () => {
      const second = fakeProvider(RouterProvider.OLLAMA_CLOUD, [ok(goodAnswer('dep_b'))]);
      const first = fakeProvider(RouterProvider.GEMINI, [fail(RouterErrorCode.MODEL_NOT_FOUND)]);

      const result = await coordinator.run(
        new Map([
          [RouterProvider.GEMINI, first.adapter],
          [RouterProvider.OLLAMA_CLOUD, second.adapter],
        ]),
        options({
          chain: [
            entry({ entryId: 'e2', order: 2, provider: RouterProvider.OLLAMA_CLOUD }),
            entry({ entryId: 'e1', order: 1, provider: RouterProvider.GEMINI }),
          ],
        }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.attempts[0]?.provider).toBe(RouterProvider.GEMINI);
        expect(result.fallbackDepth).toBe(1);
      }
    });
  });

  describe('provider-scoped failure', () => {
    // The seeded chain is Gemini, Gemini, then Ollama Cloud. A Google-wide
    // outage must not burn a second timeout on entry 2.
    it('skips every later entry on a provider that failed provider-wide', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [fail(RouterErrorCode.PROVIDER_5XX)]);
      const ollama = fakeProvider(RouterProvider.OLLAMA_CLOUD, [ok(goodAnswer('dep_c'))]);

      const result = await coordinator.run(
        new Map([
          [RouterProvider.GEMINI, gemini.adapter],
          [RouterProvider.OLLAMA_CLOUD, ollama.adapter],
        ]),
        options({
          chain: [
            entry({ entryId: 'e1', order: 1, provider: RouterProvider.GEMINI }),
            entry({ entryId: 'e2', order: 2, provider: RouterProvider.GEMINI }),
            entry({
              entryId: 'e3',
              order: 3,
              provider: RouterProvider.OLLAMA_CLOUD,
              deploymentId: 'dep_c',
            }),
          ],
        }),
      );

      expect(gemini.requests).toHaveLength(1);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.decision.deploymentId).toBe('dep_c');
      }
    });

    // A bad model id must not condemn its siblings.
    it('still tries the same provider after a model-scoped failure', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        fail(RouterErrorCode.MODEL_NOT_FOUND),
        ok(goodAnswer('dep_b')),
      ]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({
          chain: [
            entry({ entryId: 'e1', order: 1 }),
            entry({ entryId: 'e2', order: 2, deploymentId: 'dep_b' }),
          ],
        }),
      );

      expect(gemini.requests).toHaveLength(2);
      expect(result.ok).toBe(true);
    });
  });

  describe('retries', () => {
    it('retries a retryable failure within the entry budget', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        fail(RouterErrorCode.TIMEOUT),
        ok(goodAnswer()),
      ]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ chain: [entry({ retries: 1 })] }),
      );

      expect(gemini.requests).toHaveLength(2);
      expect(result.ok).toBe(true);
    });

    // Retrying a 401 cannot succeed and is how a provider starts throttling.
    it('never retries an auth failure', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        fail(RouterErrorCode.AUTHENTICATION_FAILED),
      ]);

      await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ chain: [entry({ retries: 3 })] }),
      );

      expect(gemini.requests).toHaveLength(1);
    });
  });

  describe('bounded repair', () => {
    it('re-asks once with a hint when the answer is malformed, then succeeds', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        ok('here you go: not json at all'),
        ok(goodAnswer()),
      ]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(gemini.requests).toHaveLength(2);
      expect(gemini.requests[0]?.repairHint).toBeUndefined();
      expect(gemini.requests[1]?.repairHint).toContain('rejected');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.attempts.some((a) => a.wasRepair)).toBe(true);
      }
    });

    // Two repairs would double the latency of the commonest soft failure for a
    // model that has already shown it cannot hold the schema.
    it('repairs at most once before moving on', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        ok('nope'),
        ok('still nope'),
        ok('nope'),
      ]);
      const ollama = fakeProvider(RouterProvider.OLLAMA_CLOUD, [ok(goodAnswer('dep_c'))]);

      const result = await coordinator.run(
        new Map([
          [RouterProvider.GEMINI, gemini.adapter],
          [RouterProvider.OLLAMA_CLOUD, ollama.adapter],
        ]),
        options({
          chain: [
            entry({ entryId: 'e1', order: 1 }),
            entry({
              entryId: 'e2',
              order: 2,
              provider: RouterProvider.OLLAMA_CLOUD,
              deploymentId: 'dep_c',
            }),
          ],
        }),
      );

      expect(gemini.requests).toHaveLength(2);
      expect(result.ok).toBe(true);
    });
  });

  describe('eligibility', () => {
    // Hard policy filters run before ranking. A model naming something outside
    // the eligible set has hallucinated or reached past a privacy filter.
    it('refuses a decision naming a deployment outside the eligible set', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        ok(goodAnswer('dep_forbidden')),
        ok(goodAnswer('dep_forbidden')),
      ]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(RouterErrorCode.MALFORMED_STRUCTURED_OUTPUT);
      }
    });
  });

  describe('low confidence', () => {
    // The call succeeded and the schema held; this is not a provider failure.
    it('rejects a decision below the confidence floor and advances', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer('dep_a', 0.2))]);
      const ollama = fakeProvider(RouterProvider.OLLAMA_CLOUD, [ok(goodAnswer('dep_c', 0.95))]);

      const result = await coordinator.run(
        new Map([
          [RouterProvider.GEMINI, gemini.adapter],
          [RouterProvider.OLLAMA_CLOUD, ollama.adapter],
        ]),
        options({
          chain: [
            entry({ entryId: 'e1', order: 1 }),
            entry({
              entryId: 'e2',
              order: 2,
              provider: RouterProvider.OLLAMA_CLOUD,
              deploymentId: 'dep_c',
            }),
          ],
        }),
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.attempts[0]?.code).toBe(RouterErrorCode.LOW_CONFIDENCE);
        expect(result.decision.deploymentId).toBe('dep_c');
      }
    });

    it('does not repair a low-confidence answer', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer('dep_a', 0.1))]);

      await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ chain: [entry()] }),
      );

      expect(gemini.requests).toHaveLength(1);
    });
  });

  describe('request-scoped stops', () => {
    it.each([
      RouterErrorCode.CANCELLED,
      RouterErrorCode.BUDGET_EXCEEDED,
      RouterErrorCode.POLICY_BLOCKED,
    ])('stops the whole walk on %s rather than trying the next entry', async (code) => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [fail(code)]);
      const ollama = fakeProvider(RouterProvider.OLLAMA_CLOUD, [ok(goodAnswer('dep_c'))]);

      const result = await coordinator.run(
        new Map([
          [RouterProvider.GEMINI, gemini.adapter],
          [RouterProvider.OLLAMA_CLOUD, ollama.adapter],
        ]),
        options({
          chain: [
            entry({ entryId: 'e1', order: 1 }),
            entry({
              entryId: 'e2',
              order: 2,
              provider: RouterProvider.OLLAMA_CLOUD,
              deploymentId: 'dep_c',
            }),
          ],
        }),
      );

      expect(ollama.requests).toHaveLength(0);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(code);
      }
    });
  });

  describe('budgets', () => {
    it('stops once the attempt ceiling is reached', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [fail(RouterErrorCode.MODEL_NOT_FOUND)]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({
          maxAttempts: 2,
          chain: [
            entry({ entryId: 'e1', order: 1 }),
            entry({ entryId: 'e2', order: 2, deploymentId: 'dep_b' }),
            entry({ entryId: 'e3', order: 3, deploymentId: 'dep_c' }),
          ],
        }),
      );

      expect(gemini.requests).toHaveLength(2);
      expect(result.ok).toBe(false);
    });

    // The request's remaining time outranks a per-entry timeout.
    it('never grants an entry more time than the request has left', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);
      let clock = 0;

      await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ totalDeadlineMs: 500, chain: [entry({ attemptTimeoutMs: 30_000 })] }),
        () => {
          clock += 100;
          return clock;
        },
      );

      expect(gemini.requests[0]?.timeoutMs).toBeLessThanOrEqual(500);
    });

    it('stops when the total deadline has passed', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok(goodAnswer())]);
      let clock = 0;

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ totalDeadlineMs: 10 }),
        () => {
          clock += 1_000;
          return clock;
        },
      );

      expect(gemini.requests).toHaveLength(0);
      expect(result.ok).toBe(false);
    });
  });

  describe('quarantine', () => {
    it.each([
      RouterErrorCode.MODEL_NOT_FOUND,
      RouterErrorCode.MODEL_RETIRED,
      RouterErrorCode.AUTHENTICATION_FAILED,
    ])('reports the deployment for quarantine on %s', async (code) => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [fail(code)]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.quarantinedDeploymentIds).toContain('dep_a');
      }
    });

    it('does not quarantine on a transient failure', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [fail(RouterErrorCode.PROVIDER_5XX)]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      if (!result.ok) {
        expect(result.quarantinedDeploymentIds).toHaveLength(0);
      }
    });
  });

  describe('degraded configuration', () => {
    // A partially configured chain must still route rather than fail closed on
    // the first entry whose adapter is missing.
    it('skips an entry whose provider has no registered adapter', async () => {
      const ollama = fakeProvider(RouterProvider.OLLAMA_CLOUD, [ok(goodAnswer('dep_c'))]);

      const result = await coordinator.run(
        new Map([[RouterProvider.OLLAMA_CLOUD, ollama.adapter]]),
        options({
          chain: [
            entry({ entryId: 'e1', order: 1, provider: RouterProvider.GEMINI }),
            entry({
              entryId: 'e2',
              order: 2,
              provider: RouterProvider.OLLAMA_CLOUD,
              deploymentId: 'dep_c',
            }),
          ],
        }),
      );

      expect(result.ok).toBe(true);
    });

    it('fails cleanly when the chain is empty', async () => {
      const result = await coordinator.run(new Map(), options({ chain: [] }));

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.attempts).toHaveLength(0);
      }
    });
  });

  describe('attempt records', () => {
    it('records every attempt with its entry, order and outcome', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [
        fail(RouterErrorCode.TIMEOUT),
        ok(goodAnswer()),
      ]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options({ chain: [entry({ retries: 1 })] }),
      );

      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0]).toMatchObject({
        entryId: 'e1',
        order: 1,
        attemptNumber: 1,
        outcome: 'FAILURE',
        code: RouterErrorCode.TIMEOUT,
      });
      expect(result.attempts[1]).toMatchObject({ attemptNumber: 2, outcome: 'SUCCESS' });
    });

    // Attempt records reach a trace event, so they must never carry a payload.
    it('carries only a safe message, never provider output', async () => {
      const gemini = fakeProvider(RouterProvider.GEMINI, [ok('{"totally":"wrong"}')]);

      const result = await coordinator.run(
        new Map([[RouterProvider.GEMINI, gemini.adapter]]),
        options(),
      );

      for (const attempt of result.attempts) {
        expect(attempt.safeMessage ?? '').not.toContain('totally');
      }
    });
  });
});
