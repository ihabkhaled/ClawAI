import { Locale, ThreadPublicationType } from '@claw/shared-types';

import { ROLE_MAX_MS } from '../../constants/output-retry.constants';
import { GenerationPipelineManager } from '../generation-pipeline.manager';
import type { GenerationPipelineInput, ModelRole } from '../../types/generation-pipeline.types';
import { CandidatesExhaustedError } from '../../utilities/candidates-exhausted.error';

vi.mock('../../utilities/wait-before-retry.utility', () => ({
  waitBeforeRetry: vi.fn().mockResolvedValue(undefined),
}));

const RLM = String.fromCodePoint(0x200f);
const evidenceBundle = { items: [{ id: 'source-1', url: 'https://example.org/source' }] };
const validDraft = JSON.stringify({
  markdown: 'article [source-1]',
  citations: [{ evidenceId: 'source-1', url: 'https://example.org/source' }],
});

type Call = { provider: string; systemPrompt: string; userPrompt: string; maxOutputTokens: number };
type Reply = (call: Call, authorCall: number) => string | Error;

function role(id: string, provider: string, fallbacks: ModelRole['fallbacks'] = []): ModelRole {
  return {
    id,
    provider,
    model: `${provider.toLowerCase()}-model`,
    maxOutputTokens: 1024,
    fallbacks,
  };
}

function input(locale: Locale, fallbacks: ModelRole['fallbacks'] = []): GenerationPipelineInput {
  return {
    jobId: 'job-1',
    ownerId: 'owner-1',
    budgetId: 'budget-1',
    attempt: 1,
    correlationId: 'correlation-1',
    contentLocale: locale,
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

function build(reply: Reply) {
  const calls: Call[] = [];
  let authorCalls = 0;
  const models = {
    generate: vi.fn().mockImplementation(async (args: Call) => {
      calls.push(args);
      const isFirstAuthor = args.provider === 'GEMINI' || args.provider === 'OLLAMA';
      if (isFirstAuthor) authorCalls += 1;
      // Only the first author's ask is under test; every other role fails at once to end the run.
      const next = isFirstAuthor
        ? reply(args, authorCalls)
        : new Error('Chat model request failed (400: CLOUD_PROVIDER_REQUEST_FAILED)');
      if (next instanceof Error) throw next;
      return { content: next, provider: args.provider, model: 'M', durationMs: 5, clamped: false };
    }),
  };
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
  return { manager, calls, recorder };
}

const firstAuthor = (calls: Call[]) =>
  calls.filter((call) => call.provider === 'GEMINI' || call.provider === 'OLLAMA');

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error: unknown) {
    return error;
  }
  throw new Error('expected the generation to fail');
}

describe('GenerationPipelineManager output recovery', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts an Arabic draft whose evidence id was written with Arabic-Indic digits and direction marks', async () => {
    const mangled = JSON.stringify({
      markdown: '# مقال\n\nادعاء 【source-١】.',
      citations: [{ evidenceId: `${RLM}source-١${RLM}`, url: 'https://example.org/source' }],
    });
    const { manager, calls } = build(() => mangled);

    await failureOf(manager.generate(input(Locale.AR)));

    expect(firstAuthor(calls)).toHaveLength(1);
  });

  it('reads the answer after a closed thinking block on the first ask (Ollama glm-5.3)', async () => {
    const withThinking = `<think>I should return {"markdown": "x"} maybe.</think>\n${validDraft}`;
    const { manager, calls } = build(() => withThinking);

    await failureOf(manager.generate(input(Locale.EN)));

    expect(firstAuthor(calls)).toHaveLength(1);
  });

  it('asks again with more output room and a note when the reply was cut off, more for Arabic', async () => {
    const cutOff = '{"markdown": "# مقال طويل [source-1] و';
    const { manager, calls } = build((_call, n) => (n === 1 ? cutOff : validDraft));

    await failureOf(manager.generate(input(Locale.AR)));

    const asks = firstAuthor(calls);
    expect(asks.map((call) => call.maxOutputTokens)).toEqual([1024, 2048]);
    expect(asks[1]?.userPrompt).toContain('cut off before the JSON object ended');
    expect(asks[0]?.userPrompt).not.toContain('cut off');
  });

  it('treats thinking that never ended as a cut-off and fails over after three replies', async () => {
    const endless = '<think>Let me plan the article. First, the evidence says {';
    const fallbacks = [{ provider: 'OLLAMA', model: 'glm-5.3' }];
    const { manager, calls } = build((call) => (call.provider === 'GEMINI' ? endless : validDraft));

    await failureOf(manager.generate(input(Locale.EN, fallbacks)));

    const asks = firstAuthor(calls);
    expect(asks.map((call) => [call.provider, call.maxOutputTokens])).toEqual([
      ['GEMINI', 1024],
      ['GEMINI', 1536],
      ['GEMINI', 2304],
      ['OLLAMA', 1024],
    ]);
  });

  it('stops starting new tries once the role has spent its time budget', async () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const fallbacks = [
      { provider: 'OLLAMA', model: 'glm-5.3' },
      { provider: 'OPENROUTER', model: 'mistral-small' },
    ];
    const { manager, calls } = build(() => {
      now = ROLE_MAX_MS + 1;
      return 'Sure! Here is the article you asked for.';
    });

    const error = await failureOf(manager.generate(input(Locale.EN, fallbacks)));

    expect(firstAuthor(calls)).toHaveLength(1);
    const cause = (error as Error).cause;
    expect(cause).toBeInstanceOf(CandidatesExhaustedError);
    expect((cause as CandidatesExhaustedError).outcomes.map(({ code }) => code)).toEqual([
      'OUTPUT_INVALID',
    ]);
  });
});
