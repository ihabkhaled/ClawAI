import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { ChatModelIncompleteError } from '../../../models/chat-model-incomplete.error';
import { GenerationPipelineManager } from '../generation-pipeline.manager';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { revisionDraftHash } from '../../utilities/revision-review.utility';

vi.mock('../../utilities/wait-before-retry.utility', () => ({
  waitBeforeRetry: vi.fn().mockResolvedValue(undefined),
}));

const FENCE = '```';
const evidenceBundle = { items: [{ id: 'source-1', url: 'https://example.org/source' }] };

function role(id: string, provider: string): ModelRole {
  return {
    id,
    provider,
    model: `${provider.toLowerCase()}-model`,
    maxOutputTokens: 1024,
    fallbacks: [],
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

const draftJson = JSON.stringify({
  markdown: 'article',
  citations: [{ evidenceId: 'source-1', url: 'https://example.org/source' }],
});
const voteJson = JSON.stringify({
  agrees: true,
  draftHash: revisionDraftHash(JSON.parse(draftJson)),
});
const reviewJson = (score: number) =>
  JSON.stringify({ score, blockers: [], findings: [], revisionBrief: 'fix it' });

type Reply = { content: string; costMicroUsd?: number } | Error;

function build(replies: Reply[], addSpend = vi.fn().mockResolvedValue(undefined)) {
  const models = {
    generate: vi.fn().mockImplementation(async () => {
      const next = replies.shift();
      if (next === undefined) throw new Error('unexpected model call');
      if (next instanceof Error) throw next;
      return { provider: 'P', model: 'M', durationMs: 7, clamped: false, ...next };
    }),
  };
  const jobs = {
    loadResumeState: vi.fn().mockResolvedValue({ evidenceBundle: null, evidenceBundleHash: null }),
    findCommunication: vi.fn().mockResolvedValue(null),
    saveResearchEvidence: vi.fn().mockResolvedValue(true),
    saveProgress: vi.fn().mockResolvedValue(undefined),
    saveCommunication: vi.fn().mockResolvedValue(true),
    addSpend,
  };
  const research = {
    run: vi.fn().mockResolvedValue({
      researchRunId: 'r',
      bundle: evidenceBundle,
      sha256: 'a'.repeat(64),
      version: 1,
    }),
  };
  const recorder = { record: vi.fn().mockResolvedValue(undefined) };
  const spendSync = { sync: vi.fn().mockResolvedValue(undefined) };
  const manager = new GenerationPipelineManager(
    research as never,
    models as never,
    jobs as never,
    recorder as never,
    spendSync as never,
  );
  return { manager, jobs, models, recorder, spendSync };
}

const paid = (content: string, costMicroUsd: number): Reply => ({ content, costMicroUsd });
const total = (addSpend: ReturnType<typeof vi.fn>) =>
  addSpend.mock.calls.reduce((sum, call) => sum + Number(call[1]), 0);

describe('GenerationPipelineManager spend', () => {
  it('adds the cost of every model call to the job', async () => {
    const { manager, jobs } = build([
      paid(draftJson, 100),
      paid(draftJson, 200),
      paid(draftJson, 300),
      paid(voteJson, 10),
      paid(voteJson, 10),
      paid(voteJson, 10),
      paid(reviewJson(80), 40),
      paid(reviewJson(75), 50),
    ]);

    await manager.generate(input);

    expect(jobs.addSpend).toHaveBeenCalledTimes(8);
    expect(jobs.addSpend).toHaveBeenCalledWith('job-1', 100);
    expect(total(jobs.addSpend)).toBe(720);
  });

  it('syncs the budget spend after each settled model call, even for a reply without a cost', async () => {
    const { manager, spendSync } = build([
      { content: draftJson },
      { content: draftJson },
      { content: draftJson },
      { content: voteJson },
      { content: voteJson },
      { content: voteJson },
      { content: reviewJson(80) },
      { content: reviewJson(75) },
    ]);

    await manager.generate(input);

    expect(spendSync.sync).toHaveBeenCalledTimes(8);
    expect(spendSync.sync).toHaveBeenCalledWith('job-1', input.budgetId);
  });

  it('does not record anything for a reply without a reported cost', async () => {
    const { manager, jobs } = build([
      { content: draftJson },
      { content: draftJson },
      { content: draftJson },
      { content: voteJson },
      { content: voteJson },
      { content: voteJson },
      { content: reviewJson(80) },
      { content: reviewJson(75) },
    ]);

    await manager.generate(input);

    expect(jobs.addSpend).not.toHaveBeenCalled();
  });

  it('counts a reply that is paid for but unusable, once per try', async () => {
    const { manager, jobs } = build([
      paid('Sorry, I will write prose instead.', 7),
      paid('Still prose.', 7),
      paid('x', 7),
      paid('x', 7),
      paid('x', 7),
      paid('x', 7),
    ]);

    await expect(manager.generate(input)).rejects.toThrow('An author role failed');

    expect(total(jobs.addSpend)).toBe(42);
  });

  it('counts the cost of a reply cut short after the gateway charged for it', async () => {
    const { manager, jobs, recorder } = build([
      new ChatModelIncompleteError(55),
      new ChatModelIncompleteError(55),
      new ChatModelIncompleteError(55),
    ]);

    await expect(manager.generate(input)).rejects.toThrow('An author role failed');

    expect(total(jobs.addSpend)).toBe(165);
    expect(recorder.record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ outcome: 'FAILED' }),
    );
  });

  it('keeps generating when the spend cannot be stored', async () => {
    const addSpend = vi.fn().mockRejectedValue(new Error('db down'));
    const { manager } = build(
      [
        paid(draftJson, 1),
        paid(draftJson, 1),
        paid(draftJson, 1),
        paid(voteJson, 1),
        paid(voteJson, 1),
        paid(voteJson, 1),
        paid(reviewJson(80), 1),
        paid(reviewJson(75), 1),
      ],
      addSpend,
    );

    await expect(manager.generate(input)).resolves.toBeDefined();
    expect(addSpend).toHaveBeenCalledTimes(8);
  });
});

describe('GenerationPipelineManager tolerant output', () => {
  it('accepts fenced and prose-wrapped JSON from every role', async () => {
    const fenced = (value: string) => ({ content: `${FENCE}json\n${value}\n${FENCE}` });
    const wrapped = (value: string) => ({ content: `Here you go:\n${value}\nDone.` });
    const { manager, models } = build([
      fenced(draftJson),
      wrapped(draftJson),
      fenced(draftJson),
      fenced(voteJson),
      wrapped(voteJson),
      fenced(voteJson),
      wrapped(reviewJson(80)),
      fenced(reviewJson(75)),
    ]);

    await expect(manager.generate(input)).resolves.toBeDefined();
    expect(models.generate).toHaveBeenCalledTimes(8);
  });

  it('still fails with OUTPUT_INVALID when no valid JSON is present', async () => {
    const { manager, recorder } = build(Array.from({ length: 12 }, () => ({ content: '{"cut' })));

    await expect(manager.generate(input)).rejects.toThrow('An author role failed');

    expect(recorder.record).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ outcome: 'FAILED', code: 'OUTPUT_INVALID' }),
    );
  });
});
