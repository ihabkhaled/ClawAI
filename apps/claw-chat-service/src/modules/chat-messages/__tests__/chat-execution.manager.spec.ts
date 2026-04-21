import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import { JudgeDecision } from '../../../common/enums';

jest.mock('../../../common/utilities', () => ({
  httpRequest: jest.fn(),
}));
jest.mock('../../../app/config/app.config');

const { httpRequest } = jest.requireMock('../../../common/utilities') as {
  httpRequest: jest.Mock;
};
const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

AppConfig.get.mockReturnValue({
  OLLAMA_SERVICE_URL: 'http://ollama:4008',
  OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
  CONNECTOR_SERVICE_URL: 'http://connector:4011',
});

const makeContext = (content: string): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [
      {
        id: 'msg-1',
        threadId: 'thread-1',
        role: 'USER',
        content,
      },
    ],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

describe('ChatExecutionManager', () => {
  let manager: ChatExecutionManager;
  let contextAssembly: Partial<Record<keyof ContextAssemblyManager, jest.Mock>>;
  let qualityManager: Partial<Record<keyof QualityCheckManager, jest.Mock>>;
  let judgeManager: Partial<Record<keyof JudgeRefereeManager, jest.Mock>>;
  let streamService: Partial<Record<keyof ChatStreamService, jest.Mock>>;
  let localModelSelection: Partial<Record<keyof LocalModelSelectionService, jest.Mock>>;

  beforeEach(() => {
    jest.clearAllMocks();

    contextAssembly = {
      buildPromptString: jest.fn().mockReturnValue('user prompt'),
      buildChatMessages: jest
        .fn()
        .mockReturnValue([{ role: 'user', content: 'Explain this briefly' }]),
    };

    qualityManager = {
      checkResponseQuality: jest.fn().mockReturnValue({ score: 0.9, reasons: [] }),
      shouldReRoute: jest.fn().mockReturnValue({ shouldReRoute: false }),
    };

    judgeManager = {
      setExecutionManager: jest.fn(),
      shouldActivate: jest.fn().mockReturnValue(false),
      evaluate: jest.fn(),
      buildMetadata: jest.fn().mockReturnValue({ judgeEnabled: true }),
    };

    streamService = {
      emitProviderSelected: jest.fn(),
      emitFallbackAttempt: jest.fn(),
      emitError: jest.fn(),
    };

    localModelSelection = {
      resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
    };

    manager = new ChatExecutionManager(
      contextAssembly as unknown as ContextAssemblyManager,
      qualityManager as unknown as QualityCheckManager,
      judgeManager as unknown as JudgeRefereeManager,
      streamService as unknown as ChatStreamService,
      localModelSelection as unknown as LocalModelSelectionService,
    );
  });

  it('uses fast path for short AUTO operational prompts and skips heavy checks', async () => {
    const context = makeContext('status?');
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        model: 'qwen3:1.7b',
        response: 'All good.',
        done: true,
        promptEvalCount: 10,
        evalCount: 5,
      },
    });

    const result = await manager.execute(
      {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'local-ollama',
        selectedModel: 'AUTO',
        routingMode: 'AUTO',
        timestamp: new Date().toISOString(),
      },
      context,
    );

    expect(qualityManager.checkResponseQuality).not.toHaveBeenCalled();
    expect(judgeManager.shouldActivate).not.toHaveBeenCalled();
    expect(result.fastPathUsed).toBe(true);

    const requestBody = httpRequest.mock.calls[0][0].body as {
      think: boolean;
      options: { num_predict: number };
      prompt: string;
    };
    expect(requestBody.think).toBe(false);
    expect(requestBody.options.num_predict).toBe(72);
    expect(requestBody.prompt).toContain('Respond briefly in 2-4 sentences');
  });

  it('keeps normal path for complex prompts and still runs quality checks', async () => {
    const context = makeContext(
      'Provide a comprehensive architecture analysis with trade-offs and a detailed plan.',
    );
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        model: 'qwen3:1.7b',
        response: 'Detailed response',
        done: true,
      },
    });

    const result = await manager.execute(
      {
        messageId: 'msg-2',
        threadId: 'thread-1',
        selectedProvider: 'local-ollama',
        selectedModel: 'AUTO',
        routingMode: 'AUTO',
        detectedCategory: 'coding',
        timestamp: new Date().toISOString(),
      },
      context,
    );

    expect(qualityManager.checkResponseQuality).toHaveBeenCalledTimes(1);
    expect(judgeManager.shouldActivate).toHaveBeenCalledTimes(1);
    expect(result.fastPathUsed).toBe(false);

    const requestBody = httpRequest.mock.calls[0][0].body as {
      think: boolean;
      options: { num_predict: number };
    };
    expect(requestBody.think).toBe(false);
    expect(requestBody.options.num_predict).toBe(112);
  });

  it('caps cloud max_tokens and injects short constraint in fast AUTO mode', async () => {
    const context = makeContext('show last deploy status');
    const now = Date.now();

    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { provider: 'OPENAI', apiKey: 'test-key', baseUrl: 'https://api.openai.com/v1' },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          id: 'chatcmpl-1',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Service is healthy.' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        },
      });

    const result = await manager.callProvider(
      'OPENAI',
      'gpt-4o-mini',
      context,
      now,
      false,
      undefined,
      'AUTO',
      { fastPathEnabled: true, maxOutputTokens: 72, applyShortResponseConstraint: true },
    );

    expect(result.content).toBe('Service is healthy.');
    const completionRequest = httpRequest.mock.calls[1][0].body as {
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(completionRequest.max_tokens).toBe(72);
    expect(completionRequest.messages[0]?.role).toBe('system');
    expect(completionRequest.messages[0]?.content).toContain('Respond briefly in 2-4 sentences');
  });

  it('does not force fast path when judge is explicitly enabled', async () => {
    const context = makeContext('status?');
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        model: 'qwen3:1.7b',
        response: 'All good.',
        done: true,
      },
    });

    judgeManager.shouldActivate = jest.fn().mockReturnValue(true);
    judgeManager.evaluate = jest.fn().mockResolvedValue({
      criticEvaluation: {
        feedback: [],
        score: 0.9,
        category: 'generic',
        model: 'OPENAI/gpt-4o-mini',
        latencyMs: 100,
      },
      judgeVerdict: {
        decision: JudgeDecision.ACCEPT,
        reasoning: 'Looks good',
        confidence: 0.9,
        model: 'local-ollama/AUTO',
        latencyMs: 80,
      },
      totalLatencyMs: 180,
      revisedResponse: undefined,
    });

    const result = await manager.execute(
      {
        messageId: 'msg-3',
        threadId: 'thread-1',
        selectedProvider: 'local-ollama',
        selectedModel: 'AUTO',
        routingMode: 'AUTO',
        judgeEnabled: true,
        timestamp: new Date().toISOString(),
      },
      context,
    );

    expect(qualityManager.checkResponseQuality).toHaveBeenCalledTimes(1);
    expect(judgeManager.shouldActivate).toHaveBeenCalledTimes(1);
    expect(result.fastPathUsed).toBe(false);
  });
});
