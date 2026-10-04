import { GenerationPipelineManager } from '../generation-pipeline.manager';
import { createHash } from 'node:crypto';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';

const evidenceBundle = {
  items: [{ id: 'source-1', url: 'https://example.org/source' }],
};

function role(id: string, provider = 'OPENAI'): ModelRole {
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
  topic: 'A sufficiently detailed topic',
  publicationType: 'article',
  sourceSnapshot: { messages: [{ role: 'USER', content: 'Explain this subject.' }] },
  authors: [role('author-1'), role('author-2', 'ANTHROPIC'), role('author-3', 'GEMINI')],
  judge: role('judge', 'MISTRAL'),
  critic: role('critic', 'DEEPSEEK'),
};

function build(modelResponses: string[]) {
  const research = {
    run: vi.fn().mockResolvedValue({
      researchRunId: 'research-1',
      bundle: evidenceBundle,
      sha256: 'a'.repeat(64),
      version: 1,
    }),
  };
  const models = {
    generate: vi.fn().mockImplementation(async () => {
      const content = modelResponses.shift();
      if (content === undefined) throw new Error('unexpected model call');
      return {
        content,
        provider: 'OPENAI',
        model: 'model',
        durationMs: 1,
        clamped: false,
      };
    }),
  };
  const jobs = {
    loadResumeState: vi.fn().mockResolvedValue({ evidenceBundle: null, evidenceBundleHash: null }),
    findCommunication: vi.fn().mockResolvedValue(null),
    saveResearchEvidence: vi.fn().mockResolvedValue(true),
    saveCommunication: vi.fn().mockResolvedValue(true),
  };
  return {
    manager: new GenerationPipelineManager(research as never, models as never, jobs as never),
    research,
    models,
    jobs,
  };
}

const draft = (markdown: string) =>
  JSON.stringify({
    markdown,
    citations: [{ evidenceId: 'source-1', url: 'https://example.org/source' }],
  });
const review = (score: number) =>
  JSON.stringify({ score, blockers: [], findings: [], revisionBrief: '' });

describe('GenerationPipelineManager', () => {
  it('passes identical source and evidence to every role and accepts threshold boundaries', async () => {
    const harness = build([
      draft('grounded article'),
      draft('grounded article'),
      draft('grounded article'),
      review(80),
      review(75),
    ]);

    const result = await harness.manager.generate(input);

    expect(result.rounds).toBe(1);
    expect(result.citations).toEqual([
      { evidenceId: 'source-1', url: 'https://example.org/source' },
    ]);
    expect(harness.research.run).toHaveBeenCalledOnce();
    expect(harness.jobs.saveResearchEvidence).toHaveBeenCalledOnce();
    expect(harness.jobs.saveCommunication).toHaveBeenCalledTimes(5);
    const prompts = harness.models.generate.mock.calls.map((call) => call[0].userPrompt);
    expect(prompts).toHaveLength(5);
    expect(prompts.every((prompt) => prompt.includes(JSON.stringify(evidenceBundle)))).toBe(true);
    expect(prompts.every((prompt) => prompt.includes(JSON.stringify(input.sourceSnapshot)))).toBe(
      true,
    );
  });

  it('resumes from the persisted evidence and completed role outputs without another model call', async () => {
    const harness = build([]);
    const hash = createHash('sha256').update(JSON.stringify(evidenceBundle)).digest('hex');
    harness.jobs.loadResumeState.mockResolvedValue({
      evidenceBundle,
      evidenceBundleHash: hash,
    });
    harness.jobs.findCommunication
      .mockResolvedValueOnce(JSON.parse(draft('grounded article')))
      .mockResolvedValueOnce(JSON.parse(draft('grounded article')))
      .mockResolvedValueOnce(JSON.parse(draft('grounded article')))
      .mockResolvedValueOnce(JSON.parse(review(80)))
      .mockResolvedValueOnce(JSON.parse(review(75)));

    const result = await harness.manager.generate(input);

    expect(result.rounds).toBe(1);
    expect(harness.research.run).not.toHaveBeenCalled();
    expect(harness.models.generate).not.toHaveBeenCalled();
  });

  it('restarts the round when author hashes disagree', async () => {
    const harness = build([
      draft('draft A'),
      draft('draft B'),
      draft('draft A'),
      draft('draft C'),
      draft('draft C'),
      draft('draft C'),
      review(80),
      review(75),
    ]);

    const result = await harness.manager.generate(input);

    expect(result.rounds).toBe(2);
    expect(harness.models.generate).toHaveBeenCalledTimes(8);
  });

  it('rejects citations that are not in the shared evidence bundle', async () => {
    const harness = build([
      JSON.stringify({
        markdown: 'not grounded',
        citations: [{ evidenceId: 'other', url: 'https://bad.example' }],
      }),
      draft('grounded'),
      draft('grounded'),
    ]);

    await expect(harness.manager.generate(input)).rejects.toThrow(
      'A draft cited a URL outside its evidence bundle',
    );
  });

  it('requires at least three authors before running research', async () => {
    const harness = build([]);

    await expect(
      harness.manager.generate({ ...input, authors: input.authors.slice(0, 2) }),
    ).rejects.toThrow('Generation requires three to five author roles');
    expect(harness.research.run).not.toHaveBeenCalled();
  });
});
