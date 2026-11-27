import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { httpRequest } from '../../../../common/utilities';
import type * as Utilities from '../../../../common/utilities';
import type { HarnessCouncilGenerate, HarnessCouncilVote } from '../../types/harness-council.types';
import { type ResearchGateCandidate, type ResearchPlan } from '../../types/research-gate.types';
import { PlannedResearchAction } from '../../../../common/enums/planned-research-action.enum';
import {
  applyCouncilToPlan,
  extractFirstJsonObject,
  isCouncilDecided,
  mergeCouncilVotes,
  parseCouncilVote,
} from '../../utilities/harness-council.utility';
import { HarnessCouncilService } from '../harness-council.service';
import { ResearchGateService } from '../research-gate.service';

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof Utilities>()),
  httpRequest: vi.fn(),
}));

const mockedHttpRequest = vi.mocked(httpRequest);

const member = (modelAlias: string): ResearchGateCandidate => ({
  provider: 'OLLAMA_CLOUD',
  modelAlias,
  timeoutMs: 10_000,
  maxTokens: 700,
});

const vote = (
  modelAlias: string,
  needsWeb: boolean,
  extra: Partial<HarnessCouncilVote> = {},
): HarnessCouncilVote => ({
  modelAlias,
  needsWeb,
  depth: needsWeb ? 3 : 0,
  languages: [],
  subQuestions: [],
  reason: '',
  ...extra,
});

describe('harness council parsing (replies measured on production)', () => {
  it('finds the object inside a code fence or prose, and respects braces and escaped quotes in strings', () => {
    expect(extractFirstJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(extractFirstJsonObject('Sure! {"q":"a {brace} and \\"quote\\""} done')).toBe(
      '{"q":"a {brace} and \\"quote\\""}',
    );
    expect(extractFirstJsonObject('{"needsWeb": true, "depth": 4, "subQ')).toBeNull();
    expect(extractFirstJsonObject('no json here')).toBeNull();
  });

  it('reads a fenced vote (mimo-v2.6-flash wraps its JSON in ```json)', () => {
    const parsed = parseCouncilVote(
      'mimo-v2.6-flash',
      '```json {"needsWeb":true,"depth":4,"languages":["ar","EN","not a code"],"subQuestions":["ما هي تفاصيل الاستقالة؟"],"reason":"recent event"}```',
    );
    expect(parsed).toEqual({
      modelAlias: 'mimo-v2.6-flash',
      needsWeb: true,
      depth: 4,
      languages: ['ar', 'en'],
      subQuestions: ['ما هي تفاصيل الاستقالة؟'],
      reason: 'recent event',
    });
  });

  it('still counts a reply cut off mid-object (minimax-m3.1-flash ran out of tokens)', () => {
    const parsed = parseCouncilVote(
      'minimax-m3.1-flash',
      '{"needsWeb":true,"depth":4,"languages":["ar","en"],"subQuestions":["ما تفاصيل',
    );
    expect(parsed).toMatchObject({ needsWeb: true, depth: 4, languages: [], subQuestions: [] });
  });

  it('clamps depth, defaults a missing research depth to standard, and empties the plan when no research', () => {
    expect(parseCouncilVote('m', '{"needsWeb":"true","depth":9}')?.depth).toBe(5);
    expect(parseCouncilVote('m', '{"needsWeb":true}')?.depth).toBe(2);
    expect(
      parseCouncilVote(
        'm',
        '{"needsWeb":false,"depth":4,"languages":["en"],"subQuestions":["x y z"]}',
      ),
    ).toMatchObject({
      depth: 0,
      languages: [],
      subQuestions: [],
    });
    expect(parseCouncilVote('m', '{"depth":3}')).toBeNull();
    expect(parseCouncilVote('m', 'I think yes')).toBeNull();
  });
});

describe('harness council merge', () => {
  it('decides early only when a strict majority of the members ASKED agree', () => {
    expect(isCouncilDecided([vote('a', true), vote('b', true), vote('c', true)], 4)).toBe(true);
    expect(isCouncilDecided([vote('a', true), vote('b', true)], 4)).toBe(false);
    expect(isCouncilDecided([vote('a', false), vote('b', false), vote('c', false)], 4)).toBe(true);
    expect(isCouncilDecided([vote('a', true), vote('b', false)], 3)).toBe(false);
  });

  it('researches on a tie, and takes depth, languages and sub-questions from the winning side', () => {
    const merged = mergeCouncilVotes(
      [
        vote('beam', true, {
          depth: 4,
          languages: ['ar', 'en'],
          subQuestions: ['Who resigned?', 'When?'],
        }),
        vote('deepseek', true, {
          depth: 3,
          languages: ['en'],
          subQuestions: ['who resigned?', 'Why?'],
        }),
        vote('mimo', false),
        vote('minimax', false),
      ],
      4,
    );
    expect(merged).toMatchObject({
      needsWeb: true,
      depth: 4,
      languages: ['en', 'ar'],
      subQuestions: ['Who resigned?', 'When?', 'Why?'],
      answered: 4,
      asked: 4,
      majority: ['beam', 'deepseek'],
    });
  });

  it('a "no" majority answers directly with depth 0, and nobody answering is null', () => {
    expect(
      mergeCouncilVotes([vote('a', false), vote('b', false), vote('c', true)], 3),
    ).toMatchObject({
      needsWeb: false,
      depth: 0,
      majority: ['a', 'b'],
    });
    expect(mergeCouncilVotes([], 4)).toBeNull();
  });
});

describe('HarnessCouncilService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      ROUTING_SERVICE_URL: 'http://routing.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
  });

  const withMembers = (aliases: string[]): void => {
    mockedHttpRequest.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: aliases.map(member),
    } as never);
  };

  it('asks every member in parallel and decides at the first unassailable majority, without waiting for the slowest', async () => {
    withMembers(['beam', 'deepseek', 'mimo', 'minimax']);
    let releaseBeam: (value: string | null) => void = () => {};
    const generate = vi.fn<HarnessCouncilGenerate>((candidate) =>
      candidate.modelAlias === 'beam'
        ? new Promise<string | null>((resolve) => {
            releaseBeam = resolve;
          })
        : Promise.resolve('{"needsWeb":true,"depth":3,"languages":["ar"]}'),
    );
    const verdict = await new HarnessCouncilService().decide('دورلي على الموضوع ده', generate);
    expect(generate).toHaveBeenCalledTimes(4);
    expect(verdict).toMatchObject({ needsWeb: true, depth: 3, answered: 3, asked: 4 });
    expect(generate.mock.calls[0]?.[1]).toContain('<<<\nدورلي على الموضوع ده\n>>>');
    releaseBeam(null);
  });

  it('returns null with no members configured, when routing fails, and when no member answers', async () => {
    withMembers([]);
    expect(await new HarnessCouncilService().decide('hi', vi.fn())).toBeNull();

    mockedHttpRequest.mockRejectedValueOnce(new Error('down'));
    expect(await new HarnessCouncilService().decide('hi', vi.fn())).toBeNull();

    withMembers(['a', 'b']);
    const failing = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('not json');
    expect(await new HarnessCouncilService().decide('hi', failing)).toBeNull();
  });
});

describe('ResearchGateService with a council', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama.test',
      ROUTING_SERVICE_URL: 'http://routing.test',
    } as unknown as ReturnType<typeof AppConfig.get>);
  });

  const councilAnswering = (
    verdict: Awaited<ReturnType<HarnessCouncilService['decide']>>,
  ): HarnessCouncilService =>
    ({ decide: vi.fn().mockResolvedValue(verdict) }) as unknown as HarnessCouncilService;

  it('uses the council verdict and never calls the single-model chain', async () => {
    const council = councilAnswering(
      mergeCouncilVotes([vote('a', true, { depth: 4 }), vote('b', true)], 2),
    );
    const gate = new ResearchGateService(council);
    const verdict = await gate.needsWeb('what happened to the Intel CEO?');
    expect(verdict).toMatchObject({ needsWeb: true, council: { depth: 4 } });
    expect(verdict.reason).toContain('council 2/2 of 2');
    expect(mockedHttpRequest).not.toHaveBeenCalled();
  });

  it('a plain order to search the internet researches even when the council says no', async () => {
    const council = councilAnswering(mergeCouncilVotes([vote('a', false), vote('b', false)], 2));
    const verdict = await new ResearchGateService(council).needsWeb(
      'search the internet for the latest news',
    );
    expect(verdict.needsWeb).toBe(true);
    expect(verdict.reason).toContain('explicit web request overrides the council');
  });

  it('falls back to the single-model chain when the council has no answer', async () => {
    mockedHttpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: [{ provider: 'OLLAMA', modelAlias: 'gate', timeoutMs: 6000, maxTokens: 64 }],
      } as never)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { response: '{"needsWeb":false,"reason":"chat"}' },
      } as never);
    const verdict = await new ResearchGateService(councilAnswering(null)).needsWeb('hello there');
    expect(verdict).toEqual({ needsWeb: false, reason: 'chat' });
  });
});

describe('applyCouncilToPlan', () => {
  const answerPlan: ResearchPlan = {
    action: PlannedResearchAction.ANSWER,
    urls: [],
    query: null,
    maxPages: 12,
    narration: '',
    thinking: '',
    decidedBy: 'gpt-oss:20b',
  };
  const facts = { message: 'what happened?', hasUserLinks: false, explicitWebRequest: false };
  const research = mergeCouncilVotes(
    [
      vote('beam', true, {
        depth: 5,
        subQuestions: ['Who is the Intel CEO who resigned in 2024?'],
      }),
      vote('deepseek', true, { depth: 4 }),
    ],
    2,
  );
  const noResearch = mergeCouncilVotes([vote('beam', false), vote('deepseek', false)], 2);

  it('turns a planner "answer" into a search led by the first sub-question when the council says research', () => {
    expect(applyCouncilToPlan(answerPlan, research ?? undefined, facts)).toMatchObject({
      action: PlannedResearchAction.SEARCH,
      query: 'Who is the Intel CEO who resigned in 2024?',
      maxPages: 30,
      decidedBy: 'council 2/2 of 2',
    });
  });

  it('lets a "no" majority stop a planner search, but never a user link or a plain order to search', () => {
    const search = { ...answerPlan, action: PlannedResearchAction.SEARCH, query: 'x' };
    expect(applyCouncilToPlan(search, noResearch ?? undefined, facts).action).toBe(
      PlannedResearchAction.ANSWER,
    );
    expect(
      applyCouncilToPlan(search, noResearch ?? undefined, { ...facts, explicitWebRequest: true }),
    ).toBe(search);
    expect(
      applyCouncilToPlan(search, noResearch ?? undefined, { ...facts, hasUserLinks: true }),
    ).toBe(search);
  });

  it('only raises the page budget, and returns the same plan with no council', () => {
    const big = { ...answerPlan, action: PlannedResearchAction.SEARCH, maxPages: 50 };
    expect(applyCouncilToPlan(big, research ?? undefined, facts)).toBe(big);
    expect(applyCouncilToPlan(answerPlan, undefined, facts)).toBe(answerPlan);
  });
});
