import { JudgeRefereeManager } from '../judge-referee.manager';
import { JudgeDecision } from '../../../../common/enums';
import type { ChatExecutionManager } from '../chat-execution.manager';
import type { ChatStreamService } from '../../services/chat-stream.service';
import type { LocalModelSelectionService } from '../../services/local-model-selection.service';
import type { AssembledContext } from '../../types/context.types';
import type { LlmResponse, MessageRoutedData } from '../../types/execution.types';

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
  threadMessages: [
    { role: 'USER', content: 'What is the capital of France?' } as AssembledContext['threadMessages'][0],
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
  let chatStream: jest.Mocked<Pick<ChatStreamService, 'emitJudgeEvaluating'>>;
  let localSelection: jest.Mocked<Pick<LocalModelSelectionService, 'resolveDefaultModel'>>;
  let executionManager: jest.Mocked<Pick<ChatExecutionManager, 'callProvider'>>;

  beforeEach(() => {
    chatStream = { emitJudgeEvaluating: jest.fn() };
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
        content: '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
        inputTokens: 30,
        outputTokens: 20,
      });

    const result = await manager.evaluate(buildResponse(), buildContext(), {
      enabled: true,
      category: undefined,
      routingMode: 'MANUAL_MODEL',
      isLocalOnly: false,
      criticEnabled: true,
      criticModel: 'OPENAI:gpt-4o-mini',
    }, buildPayload());

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
        content: '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
        provider: 'local-ollama',
        model: 'gemma3:4b',
        latencyMs: 60,
        usedFallback: false,
      });

    const result = await manager.evaluate(buildResponse(), buildContext(), {
      enabled: true,
      category: undefined,
      routingMode: 'MANUAL_MODEL',
      isLocalOnly: false,
      criticEnabled: true,
      criticModel: 'OPENAI:gpt-4o-mini',
    }, buildPayload());

    expect(result.criticEvaluation.requested).toBe(true);
    expect(result.criticEvaluation.parseFailed).toBe(true);
    expect(result.criticEvaluation.summary).toBe('Critic response could not be parsed.');
    expect(result.criticEvaluation.feedback).toEqual([]);
  });

  it('skips the critic call entirely when criticEnabled is false and marks requested=false', async () => {
    executionManager.callProvider.mockResolvedValueOnce({
      content: '{"decision": "ACCEPT", "summary": "ok", "confidence": 0.9, "reasoning": "fine", "response": "ok", "responseType": "verification_note", "recommendedChanges": []}',
      provider: 'local-ollama',
      model: 'gemma3:4b',
      latencyMs: 60,
      usedFallback: false,
    });

    const result = await manager.evaluate(buildResponse(), buildContext(), {
      enabled: true,
      category: undefined,
      routingMode: 'MANUAL_MODEL',
      isLocalOnly: false,
      criticEnabled: false,
      criticModel: null,
    }, buildPayload());

    // Only the judge call should have happened — not the critic.
    expect(executionManager.callProvider).toHaveBeenCalledTimes(1);
    expect(result.criticEvaluation.requested).toBe(false);
    expect(result.criticEvaluation.feedback).toEqual([]);
  });
});
