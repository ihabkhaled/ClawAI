import { type Mock, vi } from 'vitest';

import { ChatStreamService } from '../../services/chat-stream.service';
import { LocalModelSelectionService } from '../../services/local-model-selection.service';
import type { AssembledContext } from '../../types/context.types';
import type { LlmResponse, MessageRoutedData } from '../../types/execution.types';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';
import { ChatExecutionManager } from '../chat-execution.manager';
import { JudgeRefereeManager } from '../judge-referee.manager';

/**
 * What a reviewer is allowed to know.
 *
 * The judge's own prompt promises it "the original user question". It used to
 * receive the LAST user turn and nothing else, because both the critic and the
 * judge replaced `threadMessages` with a single synthetic message. In a
 * conversation where the question was asked early and refined since, that is a
 * fragment — and the reviewer was being asked to rule on an answer to a
 * question it had not seen.
 *
 * Worse, the replacement was partial: memories, cross-thread material and
 * research evidence survived the object spread and were still rendered into the
 * system message. The reviewer silently received context nobody told it about,
 * while the conversation it was explicitly promised had been deleted.
 */

const CONVERSATION: AssembledContext['threadMessages'] = [
  { role: 'USER', content: 'I am writing a paper on feline sleep.' },
  { role: 'ASSISTANT', content: 'Happy to help with that.' },
  { role: 'USER', content: 'How long do they sleep?' },
] as AssembledContext['threadMessages'];

function buildContext(systemPrompt: string): AssembledContext {
  return {
    userId: 'u1',
    systemPrompt,
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
    modelBudget: fallbackModelTokenBudget(),
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
    threadMessages: CONVERSATION,
  } as AssembledContext;
}

const response: LlmResponse = {
  content: 'Cats sleep about 16 hours a day.',
  provider: 'OPENAI',
  model: 'gpt-4o',
  latencyMs: 100,
  usedFallback: false,
  inputTokens: 10,
  outputTokens: 6,
};

const payload: MessageRoutedData = {
  messageId: 'm1',
  threadId: 't1',
  selectedProvider: 'OPENAI',
  selectedModel: 'gpt-4o',
  routingMode: 'MANUAL_MODEL',
  routerModel: null,
  timestamp: new Date().toISOString(),
};

const CRITIC_OK = {
  content: '{"score": 0.9, "summary": "Looks good.", "feedback": []}',
  provider: 'OPENAI',
  model: 'gpt-4o-mini',
  latencyMs: 80,
  usedFallback: false,
};

const JUDGE_OK = {
  content:
    '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
  provider: 'local-ollama',
  model: 'gemma3:4b',
  latencyMs: 60,
  usedFallback: false,
};

function harness() {
  const callProvider: Mock = vi.fn();

  const chatStream = Object.create(ChatStreamService.prototype) as ChatStreamService;
  chatStream.emitJudgeEvaluating = vi.fn();
  chatStream.emitOrchestrationStage = vi.fn();

  const localSelection = Object.create(
    LocalModelSelectionService.prototype,
  ) as LocalModelSelectionService;
  localSelection.resolveDefaultModel = vi.fn().mockResolvedValue('gemma3:4b');

  const execution = Object.create(ChatExecutionManager.prototype) as ChatExecutionManager;
  execution.callProvider = callProvider;

  const manager = new JudgeRefereeManager(chatStream, localSelection);
  manager.setExecutionManager(execution);
  return { manager, callProvider };
}

async function evaluateWith(systemPrompt: string, criticResponse = CRITIC_OK) {
  const { manager, callProvider } = harness();
  callProvider.mockResolvedValueOnce(criticResponse).mockResolvedValueOnce(JUDGE_OK);

  await manager.evaluate(
    response,
    buildContext(systemPrompt),
    {
      enabled: true,
      category: undefined,
      routingMode: 'MANUAL_MODEL',
      isLocalOnly: false,
      criticEnabled: true,
      criticModel: 'OPENAI:gpt-4o-mini',
    },
    payload,
  );

  const criticContext = callProvider.mock.calls[0]?.[2] as AssembledContext;
  const judgeContext = callProvider.mock.calls[1]?.[2] as AssembledContext;
  return { criticContext, judgeContext };
}

describe('the critic and the judge can see the conversation', () => {
  it('keeps the whole conversation and appends the review question', async () => {
    const { criticContext, judgeContext } = await evaluateWith('');

    for (const context of [criticContext, judgeContext]) {
      const contents = context.threadMessages.map((m) => m.content);
      expect(contents.slice(0, 3)).toEqual([
        'I am writing a paper on feline sleep.',
        'Happy to help with that.',
        'How long do they sleep?',
      ]);
      // The review question is the appended turn, not a replacement.
      expect(context.threadMessages).toHaveLength(4);
    }
  });

  it('shows the assistant instructions to the judge as data, not as orders', async () => {
    // Unframed, a thread whose system prompt says "answer only in French"
    // produced a judge verdict in French.
    const { judgeContext } = await evaluateWith('Always answer only in French.');

    expect(judgeContext.systemPrompt).toContain('Always answer only in French.');
    expect(judgeContext.systemPrompt).toContain('CONTEXT for your judgement');
    // The judge's own brief still has the last word.
    const framePosition = judgeContext.systemPrompt?.indexOf('Always answer only in French.') ?? -1;
    const judgePosition = judgeContext.systemPrompt?.indexOf('impartial judge') ?? -1;
    expect(judgePosition).toBeGreaterThan(framePosition);
  });

  it('does not invent a system prompt when the thread has none', async () => {
    const { criticContext } = await evaluateWith('');

    expect(criticContext.systemPrompt).not.toContain('CONTEXT for your judgement');
  });

  it('tells the judge the critic was unavailable instead of showing a fabricated score', async () => {
    // A parse failure used to be recorded as 1.0 — a perfect score for a critic
    // that had effectively not run — which fed the judge's "score >= 0.8 →
    // ACCEPT" rule and made a broken critic look like an approving one.
    const { judgeContext } = await evaluateWith('', {
      ...CRITIC_OK,
      content: 'not json at all',
    });

    const judgeQuestion = judgeContext.threadMessages.at(-1)?.content ?? '';
    expect(judgeQuestion).toContain('Critic evaluation: unavailable');
    expect(judgeQuestion).not.toContain('Score: 1');
  });
});
