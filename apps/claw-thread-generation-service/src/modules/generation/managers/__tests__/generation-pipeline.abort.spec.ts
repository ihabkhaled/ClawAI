import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { ModelCallCeilingError } from '../../../models/model-call-ceiling.error';
import { GenerationPipelineManager } from '../generation-pipeline.manager';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { abortReasonToError } from '../../utilities/abort-reason-error.utility';
import { isDeterministicGenerationError } from '../../utilities/deterministic-generation.error';
import { GenerationAttemptTimeoutError } from '../../utilities/generation-attempt-timeout.error';
import { parseStepError } from '../../utilities/parse-step-error.utility';
import { ThreadGenerationCancelledError } from '../../utilities/thread-generation-cancelled.error';

const evidenceBundle = { items: [{ id: 'source-1', url: 'https://example.org/source' }] };

function role(id: string, provider: string, fallbacks: ModelRole['fallbacks'] = []): ModelRole {
  return {
    id,
    provider,
    model: `${provider.toLowerCase()}-model`,
    maxOutputTokens: 1024,
    fallbacks,
  };
}

const input: GenerationPipelineInput = {
  jobId: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attempt: 1,
  correlationId: 'correlation-1',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic',
  publicationType: ThreadPublicationType.ARTICLE,
  sourceSnapshot: { messages: [] },
  authors: [role('author-1', 'OPENAI'), role('author-2', 'ANTHROPIC'), role('author-3', 'GEMINI')],
  judge: role('judge', 'MISTRAL'),
  critic: role('critic', 'DEEPSEEK'),
};

const withFallback = (fallbackProvider: string): GenerationPipelineInput => ({
  ...input,
  authors: [
    role('author-1', 'OPENAI', [{ provider: fallbackProvider, model: 'fallback-model' }]),
    ...input.authors.slice(1),
  ],
});

type ModelCall = { signal?: AbortSignal; provider: string };

/** A model client that never answers on its own, like the real one it stands in for, and
 *  rejects with the signal's reason once the job aborts. */
function hangingModels() {
  return {
    generate: vi.fn().mockImplementation(
      (call: ModelCall) =>
        new Promise((_resolve, reject) => {
          call.signal?.addEventListener('abort', () => {
            reject(abortReasonToError(call.signal?.reason));
          });
        }),
    ),
  };
}

function build(models: { generate: ReturnType<typeof vi.fn> }) {
  const research = {
    run: vi.fn().mockResolvedValue({
      researchRunId: 'r',
      bundle: evidenceBundle,
      sha256: 'a'.repeat(64),
      version: 1,
    }),
  };
  const jobs = {
    loadResumeState: vi.fn().mockResolvedValue({ evidenceBundle: null, evidenceBundleHash: null }),
    findCommunication: vi.fn().mockResolvedValue(null),
    saveResearchEvidence: vi.fn().mockResolvedValue(true),
    saveProgress: vi.fn().mockResolvedValue(undefined),
    saveCommunication: vi.fn().mockResolvedValue(true),
  };
  const recorder = { record: vi.fn().mockResolvedValue(undefined) };
  const manager = new GenerationPipelineManager(
    research as never,
    models as never,
    jobs as never,
    recorder as never,
  );
  return { manager, recorder };
}

const recorded = (recorder: { record: ReturnType<typeof vi.fn> }) =>
  recorder.record.mock.calls.map((call) => call[1] as Record<string, unknown>);

const failureOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => null,
    (error: unknown) => error,
  );

describe('GenerationPipelineManager cancellation and time limits', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts every model call in flight when the job is cancelled', async () => {
    const models = hangingModels();
    const { manager, recorder } = build(models);
    const job = new AbortController();
    const outcome = failureOf(manager.generate({ ...input, signal: job.signal }));
    await vi.waitFor(() => {
      expect(models.generate).toHaveBeenCalledTimes(3);
    });

    job.abort(new ThreadGenerationCancelledError());

    expect(await outcome).toBeInstanceOf(ThreadGenerationCancelledError);
    for (const [call] of models.generate.mock.calls) {
      expect((call as ModelCall).signal?.aborted).toBe(true);
    }
    expect(recorded(recorder).some((step) => step['outcome'] === 'FAILED')).toBe(false);
  });

  it('stops before the first model call when the job is already cancelled', async () => {
    const models = hangingModels();
    const { manager } = build(models);
    const job = new AbortController();
    job.abort(new ThreadGenerationCancelledError());

    const failure = await failureOf(manager.generate({ ...input, signal: job.signal }));

    expect(failure).toBeInstanceOf(ThreadGenerationCancelledError);
    expect(models.generate).not.toHaveBeenCalled();
  });

  it('ends the attempt after 25 minutes and does not try a fallback for it', async () => {
    vi.useFakeTimers();
    const models = hangingModels();
    const { manager, recorder } = build(models);
    const outcome = failureOf(manager.generate(withFallback('GROQ')));
    await vi.advanceTimersByTimeAsync(0);
    expect(models.generate).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(25 * 60_000 - 1);
    expect(models.generate.mock.calls.every(([call]) => !(call as ModelCall).signal?.aborted)).toBe(
      true,
    );
    await vi.advanceTimersByTimeAsync(1);
    const failure = await outcome;

    expect(failure).toBeInstanceOf(GenerationAttemptTimeoutError);
    expect(parseStepError(failure).code).toBe('GENERATION_ATTEMPT_TIMEOUT');
    expect(isDeterministicGenerationError(failure)).toBe(false);
    expect(models.generate).toHaveBeenCalledTimes(3);
    expect(
      recorded(recorder).filter((step) => step['code'] === 'GENERATION_ATTEMPT_TIMEOUT'),
    ).toHaveLength(3);
  });

  it('keeps no attempt timer once the attempt is over', async () => {
    vi.useFakeTimers();
    const { manager } = build(hangingModels());
    const job = new AbortController();
    job.abort();

    await failureOf(manager.generate({ ...input, signal: job.signal }));

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('GenerationPipelineManager model call failures', () => {
  const idleError = new Error('Chat model call went silent');

  function failingFirstThenAnswering(first: Error) {
    return {
      generate: vi
        .fn()
        .mockImplementation((call: ModelCall) =>
          Promise.reject(call.provider === 'OPENAI' ? first : new Error('stop here')),
        ),
    };
  }

  it('tries the fallback once after an idle timeout, recording its code', async () => {
    const models = failingFirstThenAnswering(idleError);
    const { manager, recorder } = build(models);

    await failureOf(manager.generate(withFallback('GROQ')));

    const providers = models.generate.mock.calls.map(([call]) => (call as ModelCall).provider);
    expect(providers.filter((provider) => provider === 'OPENAI')).toHaveLength(1);
    expect(providers).toContain('GROQ');
    expect(recorded(recorder)).toContainEqual(
      expect.objectContaining({
        roleId: 'author-1',
        provider: 'OPENAI',
        outcome: 'FAILED',
        code: 'MODEL_IDLE_TIMEOUT',
      }),
    );
  });

  it('tries the fallback after a reasoned-but-no-answer error frame', async () => {
    const models = failingFirstThenAnswering(
      new Error('Chat model request failed (502: MODEL_REASONED_NO_ANSWER)'),
    );
    const { manager, recorder } = build(models);

    await failureOf(manager.generate(withFallback('GROQ')));

    expect(
      models.generate.mock.calls.some(([call]) => (call as ModelCall).provider === 'GROQ'),
    ).toBe(true);
    expect(recorded(recorder)).toContainEqual(
      expect.objectContaining({ code: 'MODEL_REASONED_NO_ANSWER', httpStatus: 502 }),
    );
  });

  it('does not retry the same model after a hard ceiling when every candidate hit it', async () => {
    const models = {
      generate: vi.fn().mockRejectedValue(new ModelCallCeilingError()),
    };
    const { manager } = build(models);

    const failure = await failureOf(manager.generate(input));

    expect(isDeterministicGenerationError(failure)).toBe(true);
    expect(parseStepError(failure).code).toBe('MODEL_HARD_CEILING');
    expect(models.generate).toHaveBeenCalledTimes(3);
  });

  it('still allows a job retry when only some candidates hit the ceiling', async () => {
    const models = {
      generate: vi
        .fn()
        .mockImplementation((call: ModelCall) =>
          Promise.reject(
            call.provider === 'OPENAI'
              ? new ModelCallCeilingError()
              : new Error('Chat model gateway is unavailable'),
          ),
        ),
    };
    const { manager } = build(models);

    const failure = await failureOf(manager.generate(withFallback('GROQ')));

    expect(isDeterministicGenerationError(failure)).toBe(false);
  });
});
