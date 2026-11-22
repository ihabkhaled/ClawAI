import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { BRIEF_SYSTEM_PROMPT } from '../../constants/article-brief.constants';
import { AUTHOR_SOURCE_NOTE, REVIEW_SOURCE_NOTE } from '../../constants/source-prompt.constants';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { GenerationPipelineManager } from '../generation-pipeline.manager';

vi.mock('../../utilities/wait-before-retry.utility', () => ({
  waitBeforeRetry: vi.fn().mockResolvedValue(undefined),
}));

const evidenceBundle = { items: [{ id: 'source-1', url: 'https://example.org/rfid' }] };

/** The production topic box of 2026-11-22: an instruction about the article, not its subject. */
const INSTRUCTION_BOX =
  'this topic is huge, I want you to give me a very gignatic thread, never skip any detail, write the plan 100% done, and write the whole thing, never skip any detail or cpncise Never concise';

function role(id: string, model: string): ModelRole {
  return { id, provider: 'NVIDIANIM', model, maxOutputTokens: 8192, fallbacks: [] };
}

const sourceSnapshot = {
  title: 'عاوزيك تاخد',
  messages: [
    { id: 'm1', role: 'USER', content: 'افهم كل تفصيلة', createdAt: 'x' },
    {
      id: 'm2',
      role: 'USER',
      content: 'لو عندنا مئات الwarehouses فيها أجهزة بتقرأ RFID tags و containers',
      createdAt: 'x',
    },
    { id: 'm3', role: 'ASSISTANT', content: '# معماريّة RFID عالية الأداء', createdAt: 'x' },
  ],
};

const input: GenerationPipelineInput = {
  jobId: 'job-1',
  ownerId: 'owner-1',
  budgetId: 'budget-1',
  attempt: 1,
  correlationId: 'correlation-1',
  contentLocale: Locale.EN,
  topic: INSTRUCTION_BOX,
  publicationType: ThreadPublicationType.ARTICLE,
  sourceSnapshot,
  authors: [
    role('author-1', 'z-ai/glm-5.2'),
    role('author-2', 'moonshotai/kimi-k3'),
    role('author-3', 'z-ai/glm-5.2'),
  ],
  judge: role('judge', 'moonshotai/kimi-k2.7-code'),
  critic: role('critic', 'nvidia/nemotron-3-super'),
  briefStage: true,
};

const draft = JSON.stringify({
  markdown: '# RFID architecture',
  citations: [{ evidenceId: 'source-1', url: 'https://example.org/rfid' }],
});
const vote = JSON.stringify({ preferredCandidateIndex: 0 });
const review = (score: number) =>
  JSON.stringify({
    score,
    blockers: [],
    findings: [],
    revisionBrief: '',
    selectedCandidateIndex: 0,
  });
const TEAM_REPLIES = [draft, draft, draft, vote, vote, vote, review(80), review(75)];

function build(replies: string[]) {
  const queue = [...replies];
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
      const content = queue.shift();
      if (content === undefined) throw new Error('unexpected model call');
      return { content, provider: 'NVIDIANIM', model: 'model', durationMs: 1, clamped: false };
    }),
    contextWindowTokens: vi.fn().mockResolvedValue(131_072),
  };
  const jobs = {
    loadResumeState: vi.fn().mockResolvedValue({ evidenceBundle: null, evidenceBundleHash: null }),
    findCommunication: vi.fn().mockResolvedValue(null),
    saveResearchEvidence: vi.fn().mockResolvedValue(true),
    saveProgress: vi.fn().mockResolvedValue(undefined),
    saveCommunication: vi.fn().mockResolvedValue(true),
    readSpentMicroUsd: vi.fn().mockResolvedValue(0),
  };
  const manager = new GenerationPipelineManager(
    research as never,
    models as never,
    jobs as never,
    { record: vi.fn().mockResolvedValue(undefined) } as never,
    { sync: vi.fn().mockResolvedValue(undefined) } as never,
  );
  const prompts = () =>
    models.generate.mock.calls.map(
      (call) => call[0] as { systemPrompt: string; userPrompt: string },
    );
  const queries = () => research.run.mock.calls.map((call) => String(call[1]));
  return { manager, prompts, queries };
}

describe('A Thread from a chat whose topic box is an instruction (production 2026-11-22)', () => {
  it('plans the subject from the conversation and researches that, not the instruction', async () => {
    const planned = JSON.stringify({
      subject: 'RFID event architecture for hundreds of warehouses',
      researchQueries: ['RFID reader event ingestion at scale', 'warehouse RFID tag deduplication'],
    });
    const harness = build([planned, ...TEAM_REPLIES]);

    await harness.manager.generate(input);

    const [planner, ...team] = harness.prompts();
    expect(planner?.systemPrompt).toBe(BRIEF_SYSTEM_PROMPT);
    expect(planner?.userPrompt).toContain('RFID tags');
    expect(harness.queries()).toContain('RFID reader event ingestion at scale');
    expect(harness.queries().some((query) => /gignatic|concise/iu.test(query))).toBe(false);
    // Every role reads the box as instructions and the whole chat as the source.
    for (const prompt of team) {
      expect(prompt.userPrompt).toContain(
        `"authorInstructions":${JSON.stringify(INSTRUCTION_BOX)}`,
      );
      expect(prompt.userPrompt).toContain(`"sourceConversation":${JSON.stringify(sourceSnapshot)}`);
      expect(prompt.userPrompt).not.toContain('"topic":');
    }
    expect(
      team.slice(0, 3).every(({ systemPrompt }) => systemPrompt.includes(AUTHOR_SOURCE_NOTE)),
    ).toBe(true);
    expect(
      team.slice(-2).every(({ systemPrompt }) => systemPrompt.includes(REVIEW_SOURCE_NOTE)),
    ).toBe(true);
  });

  it('researches the box and the conversation together when the planner gives no usable answer', async () => {
    const harness = build(['not json at all', 'still not json', ...TEAM_REPLIES]);

    await harness.manager.generate(input);

    expect(harness.queries().some((query) => /RFID|warehouses/u.test(query))).toBe(true);
  });

  it('does not plan when the stage is off (an owner edit, or older callers)', async () => {
    const harness = build(TEAM_REPLIES);

    await harness.manager.generate({ ...input, briefStage: false });

    expect(harness.prompts()[0]?.systemPrompt).not.toBe(BRIEF_SYSTEM_PROMPT);
  });
});
