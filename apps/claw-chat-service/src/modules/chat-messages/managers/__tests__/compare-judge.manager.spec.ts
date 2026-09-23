import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { PaygSurface, TokenLedgerContext } from '@claw/shared-types';

import { CompareJudgeFailureReason, CompareJudgeVerdictStatus } from '../../../../common/enums';
import { REVIEW_ORIGINAL_INSTRUCTIONS_FRAME } from '../../constants/judge-referee.constants';
import { PAYG_WORKFLOW_COMPARE_JUDGE } from '../../constants/payg.constants';
import { CompareJudgeManager } from '../compare-judge.manager';
import { ModeExecutionGatewayManager } from '../mode-execution-gateway.manager';
import type { ChatContextGatewayManager } from '../chat-context-gateway.manager';
import type { ChatExecutionManager } from '../chat-execution.manager';
import type { JudgeRefereeManager } from '../judge-referee.manager';
import type { ChatStreamService } from '../../services/chat-stream.service';
import type { CompareJudgeRequest } from '../../types/compare-judge.types';
import type { AssembledContext } from '../../types/context.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';
import { buildLaneShuffle, laneIndexForLabel } from '../../utilities/compare-judge.utility';

const makeContext = (overrides: Partial<AssembledContext> = {}): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: 'Answer only in French.',
    threadMessages: [{ id: 'u1', threadId: 'thread-1', role: 'USER', content: 'Explain CRDTs.' }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 4096,
    modelBudget: { ...fallbackModelTokenBudget(), contextWindowTokens: 200_000 },
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
    ...overrides,
  }) as AssembledContext;

const judgeReply = (content: string): Record<string, unknown> => ({
  content,
  provider: 'OPENAI',
  model: 'gpt-5-mini',
  latencyMs: 40,
  usedFallback: false,
  inputTokens: 900,
  outputTokens: 120,
  tokenEstimated: false,
  tokenSource: 'NATIVE',
});

describe('CompareJudgeManager — one comparative call per compare run', () => {
  let callProvider: Mock;
  let critiqueLane: Mock;
  let gatewayBuild: Mock;
  let stream: { emitJudgeEvaluating: Mock; emitOrchestrationStage: Mock };
  let manager: CompareJudgeManager;
  let judgeContext: AssembledContext;

  const request = (overrides: Partial<CompareJudgeRequest> = {}): CompareJudgeRequest => ({
    userId: 'user-1',
    threadId: 'thread-1',
    runId: 'run-1',
    judgeModel: 'OPENAI:gpt-5-mini',
    critic: { enabled: false, model: null },
    instructions: 'Answer only in French.',
    laneContext: makeContext(),
    lanes: [
      { laneIndex: 0, provider: 'ANTHROPIC', model: 'claude-sonnet-4', content: 'Answer from lane zero.' },
      { laneIndex: 1, provider: 'GEMINI', model: 'gemini-2.5-pro', content: 'Answer from lane one.' },
      { laneIndex: 2, provider: 'DEEPSEEK', model: 'deepseek-chat', content: 'Answer from lane two.' },
    ],
    ...overrides,
  });

  // The labels the judge sees for run-1, and a reply that ranks them.
  const shuffle = buildLaneShuffle('run-1', [0, 1, 2]);
  const rankedReply = JSON.stringify({
    ranking: ['C', 'A', 'B'],
    scores: [
      { label: 'A', score: 7, reason: 'Solid.' },
      { label: 'B', score: 4, reason: 'Thin.' },
      { label: 'C', score: 9, reason: 'Best.' },
    ],
    rationale: 'C is the most complete; B misses the key point.',
  });

  beforeEach(() => {
    judgeContext = makeContext();
    callProvider = vi.fn().mockResolvedValue(judgeReply(rankedReply));
    critiqueLane = vi.fn();
    gatewayBuild = vi.fn(async () => ({
      context: judgeContext,
      thread: null,
      threadSettings: { maxTokens: 1_500 },
      messages: [],
      fileIds: [],
      latestUserMetadata: null,
    }));
    stream = { emitJudgeEvaluating: vi.fn(), emitOrchestrationStage: vi.fn() };
    const execution = { callProvider } as unknown as ChatExecutionManager;
    manager = new CompareJudgeManager(
      { build: gatewayBuild } as unknown as ChatContextGatewayManager,
      new ModeExecutionGatewayManager(execution),
      {
        resolveJudgeTarget: vi.fn().mockResolvedValue({ provider: 'OPENAI', model: 'gpt-5-mini' }),
        critiqueLane,
      } as unknown as JudgeRefereeManager,
      stream as unknown as ChatStreamService,
    );
  });

  it('makes exactly one billed provider call, through the chokepoint, as the JUDGE surface', async () => {
    await manager.judge(request());

    expect(callProvider).toHaveBeenCalledTimes(1);
    const call = callProvider.mock.calls[0] ?? [];
    expect(call[0]).toBe('OPENAI');
    expect(call[1]).toBe('gpt-5-mini');
    expect(call[8]).toBe(TokenLedgerContext.JUDGE);
    expect(call[9]).toEqual({
      surface: PaygSurface.JUDGE,
      workflow: PAYG_WORKFLOW_COMPARE_JUDGE,
      requestId: `run-1:${PAYG_WORKFLOW_COMPARE_JUDGE}`,
      threadId: 'thread-1',
    });
  });

  it('builds its context through the gateway, sized to the JUDGE model', async () => {
    await manager.judge(request({ fileIds: ['file-1'] }));

    expect(gatewayBuild).toHaveBeenCalledTimes(1);
    expect(gatewayBuild.mock.calls[0]?.[0]).toMatchObject({
      userId: 'user-1',
      threadId: 'thread-1',
      provider: 'OPENAI',
      model: 'gpt-5-mini',
      fileIds: ['file-1'],
    });
  });

  it('shows the answers anonymised, in the recorded shuffled order, with instructions framed as data', async () => {
    await manager.judge(request());

    const sent = callProvider.mock.calls[0]?.[2] as AssembledContext;
    const question = sent.threadMessages.at(-1)?.content ?? '';
    expect(sent.threadMessages[0]?.content).toBe('Explain CRDTs.');
    for (const model of ['claude-sonnet-4', 'gemini-2.5-pro', 'deepseek-chat', 'ANTHROPIC', 'GEMINI']) {
      expect(question).not.toContain(model);
    }
    // Candidate A is whichever lane the seeded shuffle put first.
    const laneUnderA = laneIndexForLabel(shuffle, 'A') ?? -1;
    const blockA = /<candidate label="A">\n([^\n]*)/u.exec(question)?.[1];
    expect(blockA).toBe(`Answer from lane ${['zero', 'one', 'two'][laneUnderA] ?? ''}.`);
    expect(sent.systemPrompt?.startsWith(REVIEW_ORIGINAL_INSTRUCTIONS_FRAME)).toBe(true);
    expect(sent.systemPrompt).toContain('Answer only in French.');
  });

  it('returns a ranking unshuffled back onto the lanes', async () => {
    const verdict = await manager.judge(request());

    expect(verdict.status).toBe(CompareJudgeVerdictStatus.RANKED);
    expect(verdict.winnerLaneIndex).toBe(laneIndexForLabel(shuffle, 'C'));
    expect(verdict.lanes.map((lane) => lane.label)).toEqual(['C', 'A', 'B']);
    expect(verdict.lanes[0]?.model).toBe(
      ['claude-sonnet-4', 'gemini-2.5-pro', 'deepseek-chat'][verdict.lanes[0]?.laneIndex ?? -1],
    );
    expect(verdict.shuffle?.order).toEqual(shuffle.order);
    expect(verdict.usage).toMatchObject({ inputTokens: 900, outputTokens: 120 });
    expect(verdict.judgeModel).toBe('OPENAI/gpt-5-mini');
  });

  it('reports "judge unavailable" with no winner when the reply does not parse', async () => {
    callProvider.mockResolvedValue(judgeReply('I think candidate C is best.'));

    const verdict = await manager.judge(request());

    expect(verdict.status).toBe(CompareJudgeVerdictStatus.UNAVAILABLE);
    expect(verdict.failureReason).toBe(CompareJudgeFailureReason.PARSE_FAILED);
    expect(verdict.winnerLaneIndex).toBeNull();
    expect(verdict.lanes).toEqual([]);
    // It was still a paid call, and the usage says so.
    expect(verdict.usage).toMatchObject({ inputTokens: 900 });
  });

  it('reports "judge unavailable" when the call itself fails, and does not throw', async () => {
    callProvider.mockRejectedValue(new Error('provider 503'));

    const verdict = await manager.judge(request());

    expect(verdict.status).toBe(CompareJudgeVerdictStatus.UNAVAILABLE);
    expect(verdict.failureReason).toBe(CompareJudgeFailureReason.CALL_FAILED);
    expect(verdict.winnerLaneIndex).toBeNull();
    expect(callProvider).toHaveBeenCalledTimes(1);
  });

  it('does not call the judge at all with fewer than two completed answers', async () => {
    const verdict = await manager.judge(request({ lanes: request().lanes.slice(0, 1) }));

    expect(callProvider).not.toHaveBeenCalled();
    expect(verdict.status).toBe(CompareJudgeVerdictStatus.SKIPPED);
    expect(verdict.failureReason).toBe(CompareJudgeFailureReason.NOT_ENOUGH_ANSWERS);
  });

  it('runs the critic once per lane, passes its notes, and still makes one judge call', async () => {
    critiqueLane.mockImplementation(async (response: { model: string }) => ({
      feedback: [`note for ${response.model === 'gemini-2.5-pro' ? 'gemini' : 'other'}`],
      score: 0.4,
      summary: 'Needs work.',
      requested: true,
      parseFailed: false,
      category: 'generic',
      model: 'OPENAI/gpt-5-mini',
      latencyMs: 1,
    }));

    const verdict = await manager.judge(
      request({ critic: { enabled: true, model: 'OPENAI:gpt-5-mini' } }),
    );

    expect(critiqueLane).toHaveBeenCalledTimes(3);
    expect(callProvider).toHaveBeenCalledTimes(1);
    const question = (callProvider.mock.calls[0]?.[2] as AssembledContext).threadMessages.at(-1)?.content;
    expect(question).toContain('note for gemini');
    // The critic's per-lane score is exactly the uncalibrated number this
    // manager exists to stop comparing; it must not reach the judge.
    expect(question).not.toContain('0.4');
    expect(verdict.lanes.every((lane) => lane.criticSummary === 'Needs work.')).toBe(true);
  });

  it('shortens answers fairly to the judge window and tells the judge so', async () => {
    judgeContext = makeContext({
      modelBudget: { ...fallbackModelTokenBudget(), contextWindowTokens: 4_000, reservedOutputTokens: 1_500 },
    });
    const long = 'x'.repeat(20_000);

    const verdict = await manager.judge(
      request({
        lanes: [
          { laneIndex: 0, provider: 'A', model: 'a', content: long },
          { laneIndex: 1, provider: 'B', model: 'b', content: 'short answer' },
          { laneIndex: 2, provider: 'C', model: 'c', content: long },
        ],
      }),
    );

    const question = (callProvider.mock.calls[0]?.[2] as AssembledContext).threadMessages.at(-1)?.content ?? '';
    expect(question).toContain('were each shortened to the same length');
    expect(question).toContain('short answer');
    expect(question.length).toBeLessThan(20_000);
    expect(verdict.truncated).toBe(true);
    const shortLane = verdict.lanes.find((lane) => lane.laneIndex === 1);
    expect(shortLane?.truncated).toBe(false);
    expect(verdict.lanes.filter((lane) => lane.truncated)).toHaveLength(2);
  });

  it('emits one judge-evaluating event and an active/completed timeline step', async () => {
    await manager.judge(request());

    expect(stream.emitJudgeEvaluating).toHaveBeenCalledTimes(1);
    expect(stream.emitJudgeEvaluating).toHaveBeenCalledWith('thread-1', null, 'OPENAI/gpt-5-mini');
    expect(stream.emitOrchestrationStage).toHaveBeenCalledTimes(2);
  });
});
