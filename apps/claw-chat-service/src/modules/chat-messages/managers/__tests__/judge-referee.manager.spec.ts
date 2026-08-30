import { JudgeRefereeManager } from '../judge-referee.manager';
import { JudgeDecision } from '../../../../common/enums';
import type { ChatExecutionManager } from '../chat-execution.manager';
import type { ChatStreamService } from '../../services/chat-stream.service';
import type { LocalModelSelectionService } from '../../services/local-model-selection.service';
import type { AssembledContext } from '../../types/context.types';
import type { LlmResponse, MessageRoutedData } from '../../types/execution.types';
import {
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../../utilities/assembled-context.utility';

const buildResponse = (overrides: Partial<LlmResponse> = {}): LlmResponse => ({
  content: 'The capital of France is Paris.',
  provider: 'OPENAI',
  model: 'gpt-4o',
  latencyMs: 100,
  usedFallback: false,
  inputTokens: 10,
  outputTokens: 6,
  ...overrides,
});

const buildContext = (): AssembledContext => ({
  userId: 'u1',
  systemPrompt: '',
  memories: [],
  contextPackItems: [],
  fileContents: [],
  workspaceCitations: [],
  researchEvidence: [],
  researchRunId: null,
  researchWarnings: [],
  tokenBudget: 4096,
  modelBudget: fallbackModelTokenBudget(),
  conversationManifest: emptyConversationManifest(),
  threadMessages: [
    {
      role: 'USER',
      content: 'What is the capital of France?',
    } as AssembledContext['threadMessages'][0],
  ],
});

const buildPayload = (): MessageRoutedData => ({
  messageId: 'm1',
  threadId: 't1',
  selectedProvider: 'OPENAI',
  selectedModel: 'gpt-4o',
  routingMode: 'MANUAL_MODEL',
  routerModel: null,
  timestamp: new Date().toISOString(),
});

describe('JudgeRefereeManager — critic invocation', () => {
  let manager: JudgeRefereeManager;
  let chatStream: jest.Mocked<
    Pick<ChatStreamService, 'emitJudgeEvaluating' | 'emitOrchestrationStage'>
  >;
  let localSelection: jest.Mocked<Pick<LocalModelSelectionService, 'resolveDefaultModel'>>;
  let executionManager: jest.Mocked<Pick<ChatExecutionManager, 'callProvider'>>;

  beforeEach(() => {
    chatStream = { emitJudgeEvaluating: jest.fn(), emitOrchestrationStage: jest.fn() };
    localSelection = { resolveDefaultModel: jest.fn().mockResolvedValue('gemma3:4b') };
    executionManager = { callProvider: jest.fn() };
    manager = new JudgeRefereeManager(
      chatStream as unknown as ChatStreamService,
      localSelection as unknown as LocalModelSelectionService,
    );
    manager.setExecutionManager(executionManager as unknown as ChatExecutionManager);
  });

  it('uses the user-supplied criticModel (PROVIDER:model) instead of the legacy default', async () => {
    // Critic call (1st), then judge call (2nd) — both go through callProvider.
    executionManager.callProvider
      .mockResolvedValueOnce({
        content: '{"score": 0.9, "summary": "Looks good.", "feedback": ["minor nit"]}',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 80,
        usedFallback: false,
        inputTokens: 20,
        outputTokens: 12,
      })
      .mockResolvedValueOnce({
        content:
          '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
        inputTokens: 30,
        outputTokens: 20,
      });

    const result = await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: true,
        criticModel: 'OPENAI:gpt-4o-mini',
      },
      buildPayload(),
    );

    expect(executionManager.callProvider).toHaveBeenCalled();
    const criticCall = executionManager.callProvider.mock.calls[0]!;
    expect(criticCall[0]).toBe('OPENAI');
    expect(criticCall[1]).toBe('gpt-4o-mini');
    expect(result.criticEvaluation.requested).toBe(true);
    expect(result.criticEvaluation.feedback).toEqual(['minor nit']);
    expect(result.criticEvaluation.summary).toBe('Looks good.');
    expect(result.criticEvaluation.parseFailed).toBe(false);
    expect(result.judgeVerdict.decision).toBe(JudgeDecision.ACCEPT);
  });

  it('persists a parse-failure marker when the critic LLM returns garbage', async () => {
    executionManager.callProvider
      .mockResolvedValueOnce({
        content: 'this is not json at all',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 80,
        usedFallback: false,
      })
      .mockResolvedValueOnce({
        content:
          '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
      });

    const result = await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: true,
        criticModel: 'OPENAI:gpt-4o-mini',
      },
      buildPayload(),
    );

    expect(result.criticEvaluation.requested).toBe(true);
    expect(result.criticEvaluation.parseFailed).toBe(true);
    expect(result.criticEvaluation.summary).toBe('Critic response could not be parsed.');
    expect(result.criticEvaluation.feedback).toEqual([]);
  });

  it('skips the critic call entirely when criticEnabled is false and marks requested=false', async () => {
    executionManager.callProvider.mockResolvedValueOnce({
      content:
        '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
      provider: 'local-ollama',
      model: 'gemma3:4b',
      latencyMs: 60,
      usedFallback: false,
    });

    const result = await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: false,
        criticModel: null,
      },
      buildPayload(),
    );

    // Only the judge call should have happened — not the critic.
    expect(executionManager.callProvider).toHaveBeenCalledTimes(1);
    expect(result.criticEvaluation.requested).toBe(false);
    expect(result.criticEvaluation.feedback).toEqual([]);
  });

  // Regression: with the critic disabled, resolveCriticTarget still ran and
  // auto-picked a cloud model from CRITIC_CLOUD_MODELS, so the judge panel
  // attributed the review to "ANTHROPIC/claude-sonnet-4" — a model that was
  // never called.
  it('attributes no critic model when the critic is disabled', async () => {
    executionManager.callProvider.mockResolvedValueOnce({
      content:
        '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
      provider: 'local-ollama',
      model: 'gemma3:4b',
      latencyMs: 60,
      usedFallback: false,
    });

    const result = await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: false,
        criticModel: null,
      },
      buildPayload(),
    );

    expect(result.criticEvaluation.model).toBe('');
    expect(result.criticEvaluation.model).not.toContain('claude');

    // The live progress envelope must not name a critic either.
    expect(chatStream.emitJudgeEvaluating).toHaveBeenCalledTimes(1);
    const [, criticLabel] = chatStream.emitJudgeEvaluating.mock.calls[0]!;
    expect(criticLabel).toBeNull();
  });

  it('names the critic that actually ran when the critic is enabled', async () => {
    executionManager.callProvider
      .mockResolvedValueOnce({
        content: '{"score": 0.8, "summary": "fine", "feedback": []}',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 50,
        usedFallback: false,
      })
      .mockResolvedValueOnce({
        content:
          '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
      });

    const result = await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: true,
        criticModel: 'OPENAI:gpt-4o-mini',
      },
      buildPayload(),
    );

    expect(result.criticEvaluation.model).toBe('OPENAI/gpt-4o-mini');
    const [, criticLabel] = chatStream.emitJudgeEvaluating.mock.calls[0]!;
    expect(criticLabel).toBe('OPENAI/gpt-4o-mini');
  });

  // Execution order is the contract: generator -> critic -> judge. The judge
  // must receive the critic's output, never run before or beside it.
  it('runs the critic before the judge and feeds its verdict into the judge call', async () => {
    executionManager.callProvider
      .mockResolvedValueOnce({
        content: '{"score": 0.4, "summary": "needs work", "feedback": ["add sources"]}',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 50,
        usedFallback: false,
      })
      .mockResolvedValueOnce({
        content:
          '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
      });

    await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: true,
        criticModel: 'OPENAI:gpt-4o-mini',
      },
      buildPayload(),
    );

    expect(executionManager.callProvider).toHaveBeenCalledTimes(2);
    const [criticCall, judgeCall] = executionManager.callProvider.mock.calls;
    expect(criticCall?.[0]).toBe('OPENAI');
    expect(judgeCall?.[0]).toBe('local-ollama');
    // The judge's assembled context carries the critic's findings, which is
    // only possible if the critic completed first.
    expect(JSON.stringify(judgeCall?.[2])).toContain('add sources');
  });

  // The critic and judge steps must be individually visible in the stream —
  // not one merged "verifying" span — so the user can see which model is
  // running right now and for how long each half of the review took.
  it('emits critic active/completed then judge active/completed, in that order', async () => {
    executionManager.callProvider
      .mockResolvedValueOnce({
        content: '{"score": 0.8, "summary": "fine", "feedback": []}',
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        latencyMs: 50,
        usedFallback: false,
      })
      .mockResolvedValueOnce({
        content:
          '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
      });

    await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: true,
        criticModel: 'OPENAI:gpt-4o-mini',
      },
      buildPayload(),
    );

    const stages = chatStream.emitOrchestrationStage.mock.calls.map(([, payload]) => ({
      label: payload.label,
      status: payload.status,
    }));
    expect(stages).toEqual([
      { label: 'Critiquing the draft', status: 'active' },
      { label: 'Critiquing the draft', status: 'completed' },
      { label: 'Judging the response', status: 'active' },
      { label: 'Judging the response', status: 'completed' },
    ]);
  });

  it('emits only judge stages, no critic stage, when the critic is disabled', async () => {
    executionManager.callProvider.mockResolvedValueOnce({
      content:
        '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
      provider: 'local-ollama',
      model: 'gemma3:4b',
      latencyMs: 60,
      usedFallback: false,
    });

    await manager.evaluate(
      buildResponse(),
      buildContext(),
      {
        enabled: true,
        category: undefined,
        routingMode: 'MANUAL_MODEL',
        isLocalOnly: false,
        criticEnabled: false,
        criticModel: null,
      },
      buildPayload(),
    );

    const labels = chatStream.emitOrchestrationStage.mock.calls.map(([, payload]) => payload.label);
    expect(labels).toEqual(['Judging the response', 'Judging the response']);
  });
});
