import { createHash } from 'node:crypto';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { GenerationPipelineManager } from '../generation-pipeline.manager';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { revisionDraftHash } from '../../utilities/revision-review.utility';

vi.mock('../../utilities/wait-before-retry.utility', () => ({
  waitBeforeRetry: vi.fn().mockResolvedValue(undefined),
}));

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
  judge: role('judge', 'MISTRAL', [{ provider: 'DEEPSEEK', model: 'ds' }]),
  critic: role('critic', 'DEEPSEEK'),
};

const draftJson = (citationUrl = 'https://example.org/source') =>
  JSON.stringify({
    markdown: 'article',
    citations: [{ evidenceId: 'source-1', url: citationUrl }],
  });
const voteJson = () =>
  JSON.stringify({
    agrees: true,
    draftHash: revisionDraftHash(JSON.parse(draftJson())),
  });
const reviewJson = (score: number) =>
  JSON.stringify({ score, blockers: [], findings: [], revisionBrief: 'fix it' });

type Reply = string | Error;

function build(replies: Reply[], researchError?: Error) {
  const research = {
    run: researchError
      ? vi.fn().mockRejectedValue(researchError)
      : vi.fn().mockResolvedValue({
          researchRunId: 'r',
          bundle: evidenceBundle,
          sha256: 'a'.repeat(64),
          version: 1,
        }),
  };
  const models = {
    generate: vi.fn().mockImplementation(async () => {
      const next = replies.shift();
      if (next === undefined) throw new Error('unexpected model call');
      if (next instanceof Error) throw next;
      return {
        content: next,
        provider: 'P',
        model: 'M',
        durationMs: 7,
        inputTokens: 11,
        outputTokens: 13,
        clamped: false,
      };
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
  return { manager, recorder, models, jobs };
}

const recorded = (recorder: { record: ReturnType<typeof vi.fn> }) =>
  recorder.record.mock.calls.map((call) => call[1] as Record<string, unknown>);

describe('GenerationPipelineManager step recording', () => {
  it('records research, stages and every role call on the happy path', async () => {
    const { manager, recorder } = build([
      draftJson(),
      draftJson(),
      draftJson(),
      voteJson(),
      voteJson(),
      voteJson(),
      reviewJson(80),
      reviewJson(75),
    ]);

    await manager.generate(input);

    const steps = recorded(recorder);
    expect(steps[0]).toMatchObject({ stage: 'RESEARCH', roleKind: 'RESEARCH', outcome: 'STARTED' });
    expect(steps[1]).toMatchObject({ stage: 'RESEARCH', outcome: 'SUCCEEDED' });
    expect(
      steps
        .filter((s) => s['roleKind'] === 'SYSTEM' && s['outcome'] === 'STARTED')
        .map((s) => s['stage']),
    ).toEqual(['AUTHOR_DRAFTS', 'CONSENSUS', 'JUDGE', 'CRITIC']);
    const authorOk = steps.find(
      (s) => s['stage'] === 'AUTHOR_DRAFTS' && s['outcome'] === 'SUCCEEDED',
    );
    expect(authorOk).toMatchObject({
      roleKind: 'AUTHOR',
      roleId: 'author-1',
      durationMs: 7,
      inputTokens: 11,
      outputTokens: 13,
      rawExcerpt: draftJson(),
    });
    expect(
      steps.filter((s) => s['outcome'] === 'SUCCEEDED' && s['roleKind'] === 'JUDGE'),
    ).toHaveLength(1);
    expect(
      steps.filter((s) => s['outcome'] === 'SUCCEEDED' && s['roleKind'] === 'CRITIC'),
    ).toHaveLength(1);
  });

  it('records a resumed step when saved research evidence is reused', async () => {
    const hash = createHash('sha256').update(JSON.stringify(evidenceBundle)).digest('hex');
    const { manager, recorder, jobs, models } = build([
      draftJson(),
      draftJson(),
      draftJson(),
      voteJson(),
      voteJson(),
      voteJson(),
      reviewJson(80),
      reviewJson(75),
    ]);
    jobs.loadResumeState.mockResolvedValue({ evidenceBundle, evidenceBundleHash: hash });

    await manager.generate(input);

    const steps = recorded(recorder);
    expect(steps[0]).toMatchObject({
      stage: 'RESEARCH',
      outcome: 'SKIPPED',
      roleKind: 'SYSTEM',
      code: 'RESUMED_FROM_CHECKPOINT',
    });
    expect(steps.some((s) => s['roleKind'] === 'RESEARCH')).toBe(false);
    expect(models.generate).toHaveBeenCalled();
  });

  it('records a resumed step for a saved author draft', async () => {
    const { manager, recorder, jobs } = build([
      voteJson(),
      voteJson(),
      voteJson(),
      reviewJson(80),
      reviewJson(75),
    ]);
    jobs.findCommunication.mockImplementation((_job: string, roleId: string) =>
      Promise.resolve(roleId.startsWith('author-') ? JSON.parse(draftJson()) : null),
    );

    await manager.generate(input);

    const resumed = recorded(recorder).filter((s) => s['code'] === 'RESUMED_FROM_CHECKPOINT');
    expect(resumed).toHaveLength(3);
    expect(resumed[0]).toMatchObject({
      stage: 'AUTHOR_DRAFTS',
      outcome: 'SKIPPED',
      roleKind: 'AUTHOR',
      roleId: 'author-1',
    });
  });

  it('records the upstream code when an author fails', async () => {
    const upstream = new Error('Chat model request failed (402: PAYG_CREDIT_EXHAUSTED)');
    const { manager, recorder } = build([upstream, upstream, upstream]);

    await expect(manager.generate(input)).rejects.toThrow('An author role failed');

    expect(recorded(recorder).filter((s) => s['outcome'] === 'FAILED')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: 'AUTHOR_DRAFTS',
          roleKind: 'AUTHOR',
          code: 'PAYG_CREDIT_EXHAUSTED',
          httpStatus: 402,
        }),
      ]),
    );
  });

  it('records a fallback and the retry on a wrong-shape answer', async () => {
    const { manager, recorder } = build([
      draftJson(),
      draftJson(),
      draftJson(),
      voteJson(),
      voteJson(),
      voteJson(),
      new Error('Chat model request failed (402: PROVIDER_CREDIT_EXHAUSTED)'),
      reviewJson(80),
      reviewJson(75),
    ]);

    await manager.generate(input);

    const steps = recorded(recorder);
    expect(steps.find((s) => s['outcome'] === 'FAILED')).toMatchObject({
      roleKind: 'JUDGE',
      httpStatus: 402,
      code: 'PROVIDER_CREDIT_EXHAUSTED',
    });
    expect(steps.find((s) => s['outcome'] === 'FALLBACK')).toMatchObject({
      roleKind: 'JUDGE',
      provider: 'DEEPSEEK',
      model: 'ds',
      code: 'FALLBACK_USED',
    });
  });

  it('marks a wrong-shape answer RETRY and then FAILED with OUTPUT_INVALID', async () => {
    const { manager, recorder } = build(Array.from({ length: 12 }, () => 'nope'));
    await expect(manager.generate(input)).rejects.toThrow('An author role failed');
    const invalid = recorded(recorder).filter((s) => s['code'] === 'OUTPUT_INVALID');
    expect(invalid.map((s) => s['outcome'])).toContain('RETRY');
    expect(invalid.map((s) => s['outcome'])).toContain('FAILED');
  });

  it('records a research failure and rethrows it', async () => {
    const { manager, recorder } = build([], new Error('Research request failed (502)'));
    await expect(manager.generate(input)).rejects.toThrow('Research request failed');
    expect(recorded(recorder)).toContainEqual(
      expect.objectContaining({ stage: 'RESEARCH', outcome: 'FAILED', code: 'RESEARCH_FAILED' }),
    );
  });

  it('records CITATION_INVALID when a draft cites outside the evidence', async () => {
    const bad = JSON.parse(draftJson('https://evil.example/other')) as unknown;
    const { manager, recorder, jobs } = build([]);
    jobs.findCommunication.mockResolvedValue(bad);
    await expect(manager.generate(input)).rejects.toThrow('outside its evidence bundle');
    expect(recorded(recorder)).toContainEqual(
      expect.objectContaining({ outcome: 'FAILED', roleKind: 'SYSTEM', code: 'CITATION_INVALID' }),
    );
  });

  it('records a review retry with the brief when the judge score is too low', async () => {
    const { manager, recorder } = build([
      draftJson(),
      draftJson(),
      draftJson(),
      voteJson(),
      voteJson(),
      voteJson(),
      reviewJson(10),
      draftJson(),
      draftJson(),
      draftJson(),
      voteJson(),
      voteJson(),
      voteJson(),
      reviewJson(80),
      reviewJson(75),
    ]);

    await manager.generate(input);

    expect(recorded(recorder)).toContainEqual(
      expect.objectContaining({
        stage: 'JUDGE',
        outcome: 'RETRY',
        roleId: 'judge',
        code: 'JUDGE_SCORE_LOW',
      }),
    );
  });

  it('records CONSENSUS_NOT_REACHED when an author dissents', async () => {
    const dissent = JSON.stringify({ agrees: false, draftHash: 'x'.repeat(64) });
    const { manager, recorder } = build([
      draftJson(),
      draftJson(),
      draftJson(),
      voteJson(),
      voteJson(),
      dissent,
      draftJson(),
      draftJson(),
      draftJson(),
      voteJson(),
      voteJson(),
      voteJson(),
      reviewJson(80),
      reviewJson(75),
    ]);

    await manager.generate(input);

    expect(recorded(recorder)).toContainEqual(
      expect.objectContaining({
        stage: 'CONSENSUS',
        outcome: 'RETRY',
        code: 'CONSENSUS_NOT_REACHED',
      }),
    );
  });
});
