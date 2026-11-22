import { RouterErrorCode } from '../../../common/enums';
import { RouterProvider } from '../../../generated/prisma';
import { RouterInferenceCoordinatorManager } from '../managers/router-inference-coordinator.manager';
import type {
  RouterAnswerValidator,
  RouterChainEntryInput,
  RouterInferenceProvider,
  RouterInferenceRequest,
  RouterInferenceResponse,
  RouterWalkOptions,
} from '../types/router-inference.types';

const ok = (raw: string): RouterInferenceResponse => ({
  ok: true,
  raw,
  latencyMs: 10,
  inputTokens: 100,
  outputTokens: 20,
});

const scripted = (
  responses: RouterInferenceResponse[],
): { adapter: RouterInferenceProvider; requests: RouterInferenceRequest[] } => {
  const requests: RouterInferenceRequest[] = [];
  let index = 0;
  return {
    requests,
    adapter: {
      provider: RouterProvider.GEMINI,
      invoke: (request) => {
        requests.push(request);
        const response = responses[Math.min(index, responses.length - 1)];
        index += 1;
        return Promise.resolve(
          response ?? { ok: false, code: RouterErrorCode.UNKNOWN, safeMessage: 'x', latencyMs: 1 },
        );
      },
    },
  };
};

const entry: RouterChainEntryInput = {
  entryId: 'e1',
  order: 1,
  provider: RouterProvider.GEMINI,
  providerModelId: 'gemini-2.5-flash',
  deploymentId: 'dep_a',
  attemptTimeoutMs: 1_600,
  retries: 0,
  triggers: [],
};

const walk: RouterWalkOptions = {
  traceId: 'trace-1',
  prompt: 'classify this',
  chain: [entry],
  totalDeadlineMs: 5_000,
  maxAttempts: 6,
  minConfidence: 0.5,
};

interface ColourAnswer {
  colour: string;
  score: number;
}

/** A non-router answer shape, to prove the walk is generic. */
const colourValidator: RouterAnswerValidator<ColourAnswer> = {
  validate: (raw) => {
    const parsed = JSON.parse(raw) as Partial<ColourAnswer>;
    return typeof parsed.colour === 'string' && typeof parsed.score === 'number'
      ? { valid: true, decision: { colour: parsed.colour, score: parsed.score } }
      : { valid: false, rejection: 'SCHEMA_MISMATCH' };
  },
  confidenceOf: (answer) => answer.score,
  repairHint: () => 'COLOUR_REPAIR',
};

describe('RouterInferenceCoordinatorManager — injectable validator', () => {
  let coordinator: RouterInferenceCoordinatorManager;

  beforeEach(() => {
    coordinator = new RouterInferenceCoordinatorManager();
  });

  it('run() without a validator keeps the router decision contract (ineligible id refused)', async () => {
    const gemini = scripted([
      ok(JSON.stringify({ deploymentId: 'dep_x', workflow: 'DIRECT', confidence: 0.9 })),
    ]);
    const result = await coordinator.run(new Map([[RouterProvider.GEMINI, gemini.adapter]]), {
      ...walk,
      eligibleDeploymentIds: ['dep_a'],
    });
    expect(result.ok).toBe(false);
    // The one repair re-ask used the router's own wording.
    expect(gemini.requests[1]?.repairHint).toContain('"deploymentId":string');
  });

  it('runValidated() trusts the custom shape and gates on its confidence', async () => {
    const gemini = scripted([ok(JSON.stringify({ colour: 'blue', score: 0.8 }))]);
    const result = await coordinator.runValidated(
      new Map([[RouterProvider.GEMINI, gemini.adapter]]),
      { ...walk, validator: colourValidator },
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.decision).toEqual({ colour: 'blue', score: 0.8 });
  });

  it('runValidated() repairs a malformed answer with the custom hint, then trusts the fix', async () => {
    const gemini = scripted([
      ok(JSON.stringify({ shade: 'blue' })),
      ok(JSON.stringify({ colour: 'red', score: 0.9 })),
    ]);
    const result = await coordinator.runValidated(
      new Map([[RouterProvider.GEMINI, gemini.adapter]]),
      { ...walk, validator: colourValidator },
    );
    expect(result.ok).toBe(true);
    expect(gemini.requests[1]?.repairHint).toBe('COLOUR_REPAIR');
  });

  it('runValidated() refuses a low-confidence custom answer as LOW_CONFIDENCE', async () => {
    const gemini = scripted([ok(JSON.stringify({ colour: 'blue', score: 0.2 }))]);
    const result = await coordinator.runValidated(
      new Map([[RouterProvider.GEMINI, gemini.adapter]]),
      { ...walk, validator: colourValidator },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(RouterErrorCode.LOW_CONFIDENCE);
  });
});
