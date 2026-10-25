import { Locale, ThreadHealingStrategy, ThreadPublicationType } from '@claw/shared-types';

import { GenerationPipelineManager } from '../generation-pipeline.manager';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { parseStepError } from '../../utilities/parse-step-error.utility';
import { revisionDraftHash } from '../../utilities/revision-review.utility';

vi.mock('../../utilities/wait-before-retry.utility', () => ({
  waitBeforeRetry: vi.fn().mockResolvedValue(undefined),
}));

const evidenceBundle = {
  items: [
    { id: 'aaaa1111bbbb2222', url: 'https://example.org/one' },
    { id: 'cccc3333dddd4444', url: 'https://example.org/two' },
  ],
};

const role = (id: string, provider: string, fallbacks: ModelRole['fallbacks'] = []): ModelRole => ({
  id,
  provider,
  model: `${provider.toLowerCase()}-model`,
  maxOutputTokens: 1024,
  fallbacks,
});

const input: GenerationPipelineInput = {
  jobId: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attempt: 1,
  correlationId: 'c',
  contentLocale: Locale.EN,
  topic: 'A sufficiently detailed topic',
  publicationType: ThreadPublicationType.ARTICLE,
  sourceSnapshot: { messages: [{ id: 'm1', role: 'USER', content: 'hello', createdAt: 'x' }] },
  authors: [role('author-1', 'OPENAI'), role('author-2', 'GEMINI'), role('author-3', 'GROK')],
  judge: role('judge', 'MISTRAL'),
  critic: role('critic', 'DEEPSEEK'),
  spendCapMicroUsd: 1_000_000,
  spentMicroUsd: 0,
};

const draft = JSON.stringify({
  markdown: 'Article [aaaa1111bbbb2222].',
  citations: [{ evidenceId: 'aaaa1111bbbb2222', url: 'https://example.org/one' }],
});
const vote = JSON.stringify({ preferredCandidateIndex: 0 });
const review = (score: number) =>
  JSON.stringify({ score, blockers: [], findings: [], revisionBrief: '' });

type Reply = string | Error;

function build(
  script: (request: { provider: string; requestId: string }, call: number) => Reply,
  researchFailures = 0,
) {
  let calls = 0;
  let researchCalls = 0;
  const research = {
    run: vi.fn().mockImplementation(async () => {
      researchCalls += 1;
      if (researchCalls <= researchFailures) throw new Error('Research request failed (502)');
      return { researchRunId: 'r', bundle: evidenceBundle, sha256: 'a'.repeat(64), version: 1 };
    }),
  };
  const models = {
    generate: vi
      .fn()
      .mockImplementation(async (request: { provider: string; requestId: string }) => {
        calls += 1;
        const next = script(request, calls);
        if (next instanceof Error) throw next;
        return { content: next, provider: 'P', model: 'M', durationMs: 1, clamped: false };
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
    { sync: vi.fn().mockResolvedValue(undefined) } as never,
  );
  const steps = () => recorder.record.mock.calls.map((call) => call[1] as Record<string, unknown>);
  return { manager, models, research, steps };
}

const happy = (request: { requestId: string }): Reply => {
  if (request.requestId.includes(':author-')) return draft;
  if (request.requestId.includes('consensus-author')) return vote;
  return request.requestId.includes(':judge:') ? review(90) : review(80);
};

void revisionDraftHash;

describe('Thread generation self-healing in the pipeline (ADR-181)', () => {
  it('retries the research service once after a short wait and records the healing step', async () => {
    const { manager, research, steps } = build(happy, 1);

    const result = await manager.generate(input);

    expect(result.reviewReady).toBe(true);
    expect(research.run).toHaveBeenCalledTimes(2);
    expect(steps()).toContainEqual(
      expect.objectContaining({
        stage: 'RESEARCH',
        outcome: 'RETRY',
        code: ThreadHealingStrategy.BACKOFF_RETRY,
        rawExcerpt: 'RESEARCH_FAILED',
      }),
    );
  });

  it('gives up on research after the second failure, with the real code', async () => {
    const { manager, research } = build(happy, 2);
    const error = await manager.generate(input).catch((caught: unknown) => caught);
    expect(research.run).toHaveBeenCalledTimes(2);
    expect(parseStepError(error).code).toBe('RESEARCH_FAILED');
  });

  it('heals an author that was rate limited once: same model, then success, job passes', async () => {
    let limited = false;
    const { manager, steps } = build((request) => {
      if (request.provider === 'OPENAI' && !limited && request.requestId.includes(':author-')) {
        limited = true;
        return new Error('Chat model request failed (429: PROVIDER_RATE_LIMITED)');
      }
      return happy(request);
    });

    const result = await manager.generate(input);

    expect(result.reviewReady).toBe(true);
    expect(
      steps().filter((step) => step['code'] === ThreadHealingStrategy.BACKOFF_RETRY),
    ).toHaveLength(1);
  });

  it('accepts a draft that cites by number with the url, the shape most OpenRouter models answered first time', async () => {
    const numbered = JSON.stringify({
      markdown: 'Claim [1] and another [2].',
      citations: [
        { evidenceId: '1', url: 'https://example.org/one/' },
        { evidenceId: '2', url: 'https://example.org/two?utm_source=x' },
      ],
    });
    const { manager, models } = build((request) =>
      request.requestId.includes(':author-') ? numbered : happy(request),
    );

    const result = await manager.generate(input);

    expect(result.citations.map(({ evidenceId }) => evidenceId)).toEqual([
      'aaaa1111bbbb2222',
      'cccc3333dddd4444',
    ]);
    expect(result.markdown).toBe('Claim [aaaa1111bbbb2222] and another [cccc3333dddd4444].');
    // One call per author, one vote each, judge, critic: nothing was asked twice.
    expect(models.generate).toHaveBeenCalledTimes(8);
  });

  it('heals the Judge with its team backup after a provider outage and says so in the log', async () => {
    const withBackup = {
      ...input,
      judge: role('judge', 'MISTRAL', [{ provider: 'GEMINI', model: 'gemini-backup' }]),
    };
    const { manager, steps } = build((request, call) => {
      void call;
      return request.provider === 'MISTRAL'
        ? new Error('Chat model request failed (503)')
        : happy(request);
    });

    const result = await manager.generate(withBackup);

    expect(result.reviewReady).toBe(true);
    expect(steps()).toContainEqual(
      expect.objectContaining({
        outcome: 'FALLBACK',
        roleId: 'judge',
        code: ThreadHealingStrategy.TEAM_FALLBACK,
      }),
    );
  });

  it('fails a safety refusal straight away with its class code and no healing', async () => {
    const { manager, models } = build((request) =>
      request.provider === 'DEEPSEEK'
        ? new Error('Chat model request failed (400: CONTENT_FILTERED_SAFETY)')
        : happy(request),
    );

    const error = await manager.generate(input).catch((caught: unknown) => caught);

    expect(parseStepError(error).code).toBe('CONTENT_FILTERED_SAFETY');
    const critic = models.generate.mock.calls.filter(
      (call) => (call[0] as { provider: string }).provider === 'DEEPSEEK',
    );
    expect(critic).toHaveLength(1);
  });

  it('bounds the whole attempt: every model failing never loops', async () => {
    const { manager, models } = build(() => new Error('Chat model request failed (503)'));

    await manager.generate(input).catch(() => {});

    // 3 authors run in parallel; each is asked, waited on and asked again at most.
    expect(models.generate.mock.calls.length).toBeLessThanOrEqual(12);
  });
});
