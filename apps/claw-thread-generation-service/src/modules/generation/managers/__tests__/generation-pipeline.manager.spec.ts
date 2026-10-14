import { GenerationPipelineManager } from '../generation-pipeline.manager';
import {
  DeterministicGenerationError,
  isDeterministicGenerationError,
} from '../../utilities/deterministic-generation.error';
import { createHash } from 'node:crypto';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { revisionDraftHash } from '../../utilities/revision-review.utility';
import { Locale, ThreadPublicationType } from '@claw/shared-types';

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
  contentLocale: Locale.AR,
  topic: 'A sufficiently detailed topic',
  publicationType: ThreadPublicationType.ARTICLE,
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
    saveProgress: vi.fn().mockResolvedValue(undefined),
    saveCommunication: vi.fn().mockResolvedValue(true),
  };
  const recorder = { record: vi.fn().mockResolvedValue(undefined) };
  return {
    manager: new GenerationPipelineManager(
      research as never,
      models as never,
      jobs as never,
      recorder as never,
      { sync: vi.fn().mockResolvedValue(undefined) } as never,
    ),
    recorder,
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
const vote = (markdown: string, agrees = true) =>
  JSON.stringify({ agrees, draftHash: revisionDraftHash(JSON.parse(draft(markdown))) });
const review = (score: number) =>
  JSON.stringify({ score, blockers: [], findings: [], revisionBrief: '' });

describe('GenerationPipelineManager', () => {
  it('requires every generated author draft to use the selected publication language', async () => {
    const harness = build([
      draft('# Draft'),
      draft('# Draft'),
      draft('# Draft'),
      vote('# Draft'),
      vote('# Draft'),
      vote('# Draft'),
      review(80),
      review(75),
    ]);

    await harness.manager.generate(input);

    expect(harness.models.generate).toHaveBeenCalledWith(
      expect.objectContaining({ systemPrompt: expect.stringContaining('Arabic (ar)') }),
    );
  });

  it('accepts a valid JSON answer wrapped in a code fence', async () => {
    const fenced = (text: string) => `\`\`\`json
${text}
\`\`\``;
    const harness = build([
      fenced(draft('grounded article')),
      fenced(draft('grounded article')),
      fenced(draft('grounded article')),
      fenced(vote('grounded article')),
      fenced(vote('grounded article')),
      fenced(vote('grounded article')),
      fenced(review(80)),
      fenced(review(75)),
    ]);

    const result = await harness.manager.generate(input);

    expect(result.rounds).toBe(1);
  });

  it('tells authors and reviewers the exact JSON shape to return', async () => {
    const harness = build([
      draft('grounded article'),
      draft('grounded article'),
      draft('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
      review(80),
      review(75),
    ]);

    await harness.manager.generate(input);

    const systemPrompts = harness.models.generate.mock.calls.map((call) => call[0].systemPrompt);
    expect(systemPrompts[0]).toContain('"citations": [{"evidenceId": string, "url": string}]');
    expect(systemPrompts[6]).toContain('"score": integer 0-100');
  });

  it('tells the Judge and the Critic the requested language is correct and to review in it', async () => {
    const harness = build([
      draft('grounded article'),
      draft('grounded article'),
      draft('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
      review(80),
      review(75),
    ]);

    await harness.manager.generate(input);

    const systemPrompts = harness.models.generate.mock.calls.map((call) => call[0].systemPrompt);
    const reviewerPrompts = systemPrompts.filter((prompt) => prompt.includes('independently as'));
    expect(reviewerPrompts).toHaveLength(2);
    for (const prompt of reviewerPrompts) {
      expect(prompt).toContain('requested this publication in Arabic (ar)');
      expect(prompt).toContain('Never lower the score');
      expect(prompt).toContain('Write every finding and the revisionBrief in Arabic');
    }
  });

  it('retries a model once when its answer is not the requested JSON shape', async () => {
    const harness = build([
      'not json at all',
      draft('grounded article'),
      draft('grounded article'),
      draft('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
      review(80),
      review(75),
    ]);

    const result = await harness.manager.generate(input);

    expect(result.rounds).toBe(1);
    expect(harness.models.generate).toHaveBeenCalledTimes(9);
    const requestIds = harness.models.generate.mock.calls.map((call) => call[0].requestId);
    expect(requestIds.filter((id) => id.endsWith(':try-2'))).toHaveLength(1);
    for (const id of requestIds) {
      expect(id.startsWith('job-1:')).toBe(true);
      expect(id).toContain(`:attempt-${String(input.attempt)}:cand-`);
    }
  });

  it('fails the attempt when a model keeps answering in the wrong shape', async () => {
    const harness = build(['nope', 'still nope', draft('x'), draft('x')]);

    await expect(harness.manager.generate(input)).rejects.toThrow('An author role failed');
  });

  it('passes identical source and evidence to every role and accepts threshold boundaries', async () => {
    const harness = build([
      draft('grounded article'),
      draft('grounded article'),
      draft('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
      vote('grounded article'),
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
    expect(harness.jobs.saveProgress.mock.calls.map((call) => [call[2], call[3]])).toEqual([
      ['AUTHOR_DRAFTS', 1],
      ['CONSENSUS', 1],
      ['JUDGE', 1],
      ['CRITIC', 1],
    ]);
    expect(harness.jobs.saveCommunication).toHaveBeenCalledTimes(8);
    const prompts = harness.models.generate.mock.calls.map((call) => call[0].userPrompt);
    expect(prompts).toHaveLength(8);
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
      .mockResolvedValueOnce(JSON.parse(vote('grounded article')))
      .mockResolvedValueOnce(JSON.parse(vote('grounded article')))
      .mockResolvedValueOnce(JSON.parse(vote('grounded article')))
      .mockResolvedValueOnce(JSON.parse(review(80)))
      .mockResolvedValueOnce(JSON.parse(review(75)));

    const result = await harness.manager.generate(input);

    expect(result.rounds).toBe(1);
    expect(harness.research.run).not.toHaveBeenCalled();
    expect(harness.models.generate).not.toHaveBeenCalled();
  });

  it('restarts the round when an author votes against the exact candidate hash', async () => {
    const harness = build([
      draft('draft A'),
      draft('draft B'),
      draft('draft A'),
      vote('draft A'),
      vote('draft A', false),
      vote('draft A'),
      draft('draft C'),
      draft('draft C'),
      draft('draft C'),
      vote('draft C'),
      vote('draft C'),
      vote('draft C'),
      review(80),
      review(75),
    ]);

    const result = await harness.manager.generate(input);

    expect(result.rounds).toBe(2);
    expect(harness.models.generate).toHaveBeenCalledTimes(14);
    const roundTwoBrief = harness.models.generate.mock.calls[6]?.[0].userPrompt;
    expect(roundTwoBrief).toContain('Authors did not all agree');
    expect(roundTwoBrief).toContain('draft A');
  });

  it('does not accept a consensus when one author disagrees', async () => {
    const harness = build([
      ...Array.from({ length: 3 }, () => draft('draft A')),
      vote('draft A'),
      vote('draft A'),
      vote('draft A', false),
      ...Array.from({ length: 3 }, () => draft('draft A')),
      vote('draft A'),
      vote('draft A'),
      vote('draft A', false),
      ...Array.from({ length: 3 }, () => draft('draft A')),
      vote('draft A'),
      vote('draft A'),
      vote('draft A', false),
    ]);

    await expect(harness.manager.generate(input)).rejects.toThrow(
      'Generation did not pass consensus and reviews in three rounds',
    );
  });

  it('does not accept citations that are not in the shared evidence bundle', async () => {
    const ungrounded = JSON.stringify({
      markdown: 'not grounded',
      citations: [{ evidenceId: 'other', url: 'https://bad.example' }],
    });
    const harness = build([ungrounded, draft('grounded'), draft('grounded'), ungrounded]);

    await expect(harness.manager.generate(input)).rejects.toThrow('An author role failed');
  });

  it('retries an author whose first draft cites outside the evidence bundle', async () => {
    const ungrounded = JSON.stringify({
      markdown: 'not grounded',
      citations: [{ evidenceId: 'other', url: 'https://bad.example' }],
    });
    const harness = build([
      ungrounded,
      draft('grounded'),
      draft('grounded'),
      draft('grounded'),
      vote('grounded'),
      vote('grounded'),
      vote('grounded'),
      review(80),
      review(75),
    ]);

    const result = await harness.manager.generate(input);

    expect(result.citations).toEqual([
      { evidenceId: 'source-1', url: 'https://example.org/source' },
    ]);
  });

  it('requires at least three authors before running research', async () => {
    const harness = build([]);

    await expect(
      harness.manager.generate({ ...input, authors: input.authors.slice(0, 2) }),
    ).rejects.toThrow('Generation requires three to five author roles');
    expect(harness.research.run).not.toHaveBeenCalled();
  });

  it('marks an invalid role configuration as a failure a retry cannot fix', async () => {
    const harness = build([]);

    const tooFew = await harness.manager
      .generate({ ...input, authors: input.authors.slice(0, 2) })
      .catch((error: unknown) => error);

    expect(tooFew).toBeInstanceOf(DeterministicGenerationError);
    expect(harness.research.run).not.toHaveBeenCalled();
  });

  it('skips a same-provider fallback with a step note instead of failing the role (N-01)', async () => {
    const harness = build([
      draft('grounded'),
      draft('grounded'),
      draft('grounded'),
      vote('grounded'),
      vote('grounded'),
      vote('grounded'),
      review(80),
      review(75),
    ]);

    const result = await harness.manager.generate({
      ...input,
      authors: [
        { ...role('author-1'), fallbacks: [{ provider: 'OPENAI', model: 'other' }] },
        ...input.authors.slice(1),
      ],
    });

    expect(result.reviewReady).toBe(true);
    expect(harness.recorder.record).toHaveBeenCalledWith(
      input.jobId,
      expect.objectContaining({
        outcome: 'SKIPPED',
        roleId: 'author-1',
        code: 'FALLBACK_SKIPPED_SAME_PROVIDER',
      }),
    );
  });

  it('accepts votes whose hash echo is wrong, short or missing (D-L2-01)', async () => {
    const short = JSON.stringify({ agrees: true, draftHash: 'f'.repeat(63) });
    const harness = build([
      draft('grounded'),
      draft('grounded'),
      draft('grounded'),
      short,
      JSON.stringify({ agrees: true }),
      vote('grounded'),
      review(80),
      review(75),
    ]);

    const result = await harness.manager.generate(input);

    expect(result.authorConsensus).toBe(true);
  });

  describe('retry classification of a failed role', () => {
    const withFallbacks: GenerationPipelineInput = {
      ...input,
      authors: [
        { ...role('author-1'), fallbacks: [{ provider: 'ANTHROPIC', model: 'fallback-model' }] },
        {
          ...role('author-2', 'ANTHROPIC'),
          fallbacks: [{ provider: 'GEMINI', model: 'fallback-model' }],
        },
        {
          ...role('author-3', 'GEMINI'),
          fallbacks: [{ provider: 'OPENAI', model: 'fallback-model' }],
        },
      ],
    };
    const tooLarge = () =>
      new DeterministicGenerationError('Complete role context exceeds the model window');

    it('is deterministic when the prompt overflows every candidate of the role', async () => {
      const harness = build([]);
      harness.models.generate.mockRejectedValue(tooLarge());

      const failure = await harness.manager
        .generate(withFallbacks)
        .catch((error: unknown) => error);

      expect(isDeterministicGenerationError(failure)).toBe(true);
      expect(harness.models.generate).toHaveBeenCalledTimes(6);
    });

    it('stays retryable when a fallback failed for a transient reason', async () => {
      const harness = build([]);
      harness.models.generate.mockImplementation(async (request: { model: string }) => {
        if (request.model === 'fallback-model')
          throw new Error('Chat model gateway is unavailable');
        throw tooLarge();
      });

      const failure = await harness.manager
        .generate(withFallbacks)
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(Error);
      expect(isDeterministicGenerationError(failure)).toBe(false);
    });

    it('stays retryable when one author is deterministic and another is transient', async () => {
      const harness = build([]);
      harness.models.generate.mockImplementation(async (request: { provider: string }) => {
        if (request.provider === 'OPENAI') throw tooLarge();
        throw new Error('Chat model gateway is unavailable');
      });

      const failure = await harness.manager.generate(input).catch((error: unknown) => error);

      expect(isDeterministicGenerationError(failure)).toBe(false);
    });
  });

  it('rejects duplicate author, Judge, or Critic role identifiers', async () => {
    const harness = build([]);

    await expect(
      harness.manager.generate({ ...input, judge: role('author-1', 'MISTRAL') }),
    ).rejects.toThrow('Generation role identifiers must be unique');
    expect(harness.research.run).not.toHaveBeenCalled();
  });

  it('revalidates the exact edited text against saved evidence without running new research', async () => {
    const edited = {
      markdown: '# Owner edit\n\nEvidence-backed statement.',
      citations: [{ evidenceId: 'source-1', url: 'https://example.org/source' }],
    };
    const draftHash = revisionDraftHash(edited);
    const editedVote = JSON.stringify({ agrees: true, draftHash });
    const harness = build([editedVote, editedVote, editedVote, review(80), review(75)]);

    const result = await harness.manager.reviewRevision(
      input,
      edited,
      evidenceBundle,
      'a'.repeat(64),
    );

    expect(result).toMatchObject({
      markdown: edited.markdown,
      citations: edited.citations,
      draftHash,
      authorConsensus: true,
      reviewReady: true,
      reviewReasons: [],
    });
    expect(harness.research.run).not.toHaveBeenCalled();
    expect(harness.models.generate).toHaveBeenCalledTimes(5);
    expect(
      harness.models.generate.mock.calls.every((call) =>
        call[0].userPrompt.includes(JSON.stringify(edited)),
      ),
    ).toBe(true);
  });

  it('fails closed when an owner edit cites evidence outside the saved bundle', async () => {
    const harness = build([]);

    await expect(
      harness.manager.reviewRevision(
        input,
        {
          markdown: '# Edit',
          citations: [{ evidenceId: 'other', url: 'https://bad.example/source' }],
        },
        evidenceBundle,
        'a'.repeat(64),
      ),
    ).rejects.toThrow('A draft cited a URL outside its evidence bundle');
    expect(harness.models.generate).not.toHaveBeenCalled();
  });
});
