import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { GenerationPipelineManager } from '../generation-pipeline.manager';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { CandidatesExhaustedError } from '../../utilities/candidates-exhausted.error';
import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../../utilities/deterministic-generation.error';

import { parseStepError } from '../../utilities/parse-step-error.utility';

const evidenceBundle = { items: [{ id: 'source-1', url: 'https://example.org/source' }] };
const validDraft = JSON.stringify({
  markdown: 'article',
  citations: [{ evidenceId: 'source-1', url: 'https://example.org/source' }],
});

function role(id: string, provider: string, fallbacks: ModelRole['fallbacks'] = []): ModelRole {
  return {
    id,
    provider,
    model: `${provider.toLowerCase()}-model`,
    maxOutputTokens: 1024,
    fallbacks,
  };
}

function inputWithFallbacks(fallbacks: ModelRole['fallbacks']): GenerationPipelineInput {
  return {
    jobId: 'job-1',
    ownerId: 'owner-1',
    budgetId: 'budget-1',
    attempt: 1,
    correlationId: 'correlation-1',
    contentLocale: Locale.EN,
    topic: 'A sufficiently detailed topic',
    publicationType: ThreadPublicationType.ARTICLE,
    sourceSnapshot: { messages: [] },
    authors: [
      role('author-1', 'GEMINI', fallbacks),
      role('author-2', 'ANTHROPIC'),
      role('author-3', 'MISTRAL'),
    ],
    judge: role('judge', 'DEEPSEEK'),
    critic: role('critic', 'DEEPSEEK'),
  };
}

type Behaviour = (provider: string) => string | Error;

function build(behaviour: Behaviour) {
  const research = {
    run: vi.fn().mockResolvedValue({
      researchRunId: 'r',
      bundle: evidenceBundle,
      sha256: 'a'.repeat(64),
      version: 1,
    }),
  };
  const models = {
    generate: vi.fn().mockImplementation(async (args: { provider: string }) => {
      const next = behaviour(args.provider);
      if (next instanceof Error) throw next;
      return { content: next, provider: args.provider, model: 'M', durationMs: 5, clamped: false };
    }),
  };
  const jobs = {
    loadResumeState: vi.fn().mockResolvedValue({ evidenceBundle: null, evidenceBundleHash: null }),
    findCommunication: vi.fn().mockResolvedValue(null),
    saveResearchEvidence: vi.fn().mockResolvedValue(true),
    saveProgress: vi.fn().mockResolvedValue(undefined),
    saveCommunication: vi.fn().mockResolvedValue(true),
    addSpend: vi.fn().mockResolvedValue(undefined),
  };
  const recorder = { record: vi.fn().mockResolvedValue(undefined) };
  const manager = new GenerationPipelineManager(
    research as never,
    models as never,
    jobs as never,
    recorder as never,
    { sync: vi.fn().mockResolvedValue(undefined) } as never,
  );
  return { manager, recorder };
}

const steps = (recorder: { record: ReturnType<typeof vi.fn> }) =>
  recorder.record.mock.calls.map((call) => call[1] as Record<string, unknown>);

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the generation to fail');
}

function exhausted(error: unknown): CandidatesExhaustedError {
  const cause = (error as Error).cause;
  if (!(cause instanceof CandidatesExhaustedError))
    throw new Error('no exhausted-candidates cause');
  return cause;
}

describe('GenerationPipelineManager when every candidate of a role fails', () => {
  const fallbacks = [
    { provider: 'OLLAMA', model: 'glm' },
    { provider: 'OPENROUTER', model: 'mistral-small' },
  ];

  it('reports the repeated wrong-format cause, not the last fallback error (browser D-01)', async () => {
    const { manager } = build((provider) => {
      if (provider === 'GEMINI') return 'Sure! Here is the article you asked for.';
      if (provider === 'OLLAMA') return '{"markdown": "cut off in the mid';
      return provider === 'OPENROUTER'
        ? new Error('Chat model request failed (400: CLOUD_PROVIDER_UNAVAILABLE)')
        : validDraft;
    });

    const error = await failureOf(manager.generate(inputWithFallbacks(fallbacks)));

    const failure = exhausted(error);
    expect(failure.outcomes.map(({ provider, code }) => [provider, code])).toEqual([
      ['GEMINI', 'OUTPUT_INVALID'],
      ['OLLAMA', 'OUTPUT_INVALID'],
      ['OPENROUTER', 'PROVIDER_UNAVAILABLE'],
    ]);
    expect(failure.primary.code).toBe('OUTPUT_INVALID');
    expect(parseStepError(error)).toEqual({ code: 'OUTPUT_INVALID', httpStatus: null });
    expect(failure.summary).toContain('Main cause: OUTPUT_INVALID (2 of 3)');
    expect(failure.summary).toContain('OPENROUTER/mistral-small: PROVIDER_UNAVAILABLE (HTTP 503)');
    expect(isDeterministicGenerationError(error)).toBe(false);
  });

  it('keeps the first model cause when every candidate failed differently', async () => {
    const { manager } = build((provider) => {
      if (provider === 'GEMINI') return new Error('Chat model request failed (429)');
      if (provider === 'OLLAMA') {
        return new Error('Chat model request failed (402: PAYG_CREDIT_EXHAUSTED)');
      }
      return provider === 'OPENROUTER' ? new Error('Chat model request failed (503)') : validDraft;
    });

    const error = await failureOf(manager.generate(inputWithFallbacks(fallbacks)));

    expect(parseStepError(error)).toEqual({ code: 'PROVIDER_RATE_LIMITED', httpStatus: 429 });
  });

  it('records a classified, readable reason on each wrong-format step', async () => {
    const { manager, recorder } = build((provider) => {
      if (provider === 'GEMINI') return 'Sure! Here is the article you asked for.';
      if (provider === 'OLLAMA') return '{"markdown": "cut off in the mid';
      return provider === 'OPENROUTER' ? '   ' : validDraft;
    });

    await failureOf(manager.generate(inputWithFallbacks(fallbacks)));

    const invalid = steps(recorder).filter(
      (step) => step['roleId'] === 'author-1' && step['code'] === 'OUTPUT_INVALID',
    );
    const reasons = invalid.map((step) => String(step['rawExcerpt']).split(':')[0]);
    expect(reasons).toEqual(['PROSE', 'PROSE', 'TRUNCATED', 'TRUNCATED', 'EMPTY', 'EMPTY']);
    expect(String(invalid[0]?.['rawExcerpt'])).toContain('plain text with no JSON object');
  });

  it('stays deterministic only when every candidate failed for a reason a retry cannot fix', async () => {
    const { manager } = build((provider) =>
      provider === 'GEMINI' || provider === 'OLLAMA'
        ? new DeterministicGenerationError('Prompt exceeds the model window')
        : validDraft,
    );

    const error = await failureOf(
      manager.generate(inputWithFallbacks([{ provider: 'OLLAMA', model: 'glm' }])),
    );

    expect(isDeterministicGenerationError(error)).toBe(true);
    expect(parseStepError(error)).toEqual({ code: 'CONTEXT_WINDOW_EXCEEDED', httpStatus: null });
  });

  it('does not make a role permanent when one candidate failed transiently', async () => {
    const { manager } = build((provider) => {
      if (provider === 'GEMINI') return new Error('Chat model request failed (503)');
      return provider === 'OLLAMA'
        ? new DeterministicGenerationError('Prompt exceeds the model window')
        : validDraft;
    });

    const error = await failureOf(
      manager.generate(inputWithFallbacks([{ provider: 'OLLAMA', model: 'glm' }])),
    );

    expect(isDeterministicGenerationError(error)).toBe(false);
  });
});
