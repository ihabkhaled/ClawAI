import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import { JudgeDecision } from '../../../common/enums';
// Import the live caps so the test moves with the constants rather than
// pinning brittle numeric literals — previously the test asserted
// num_predict === 112 which broke the moment we raised the AUTO cap to
// stop truncating compare-mode responses mid-word.
import {
  FAST_PATH_MAX_OUTPUT_TOKENS,
  HARD_MAX_OUTPUT_TOKENS,
} from '../constants/execution-fast-path.constants';

jest.mock('../../../common/utilities', () => ({
  httpRequest: jest.fn(),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined => {
    if (!record) return undefined;
    return Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined;
  },
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
  FILE_GENERATION_SERVICE_URL: 'http://file-generation:4013',
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
      emitRouterStarted: jest.fn(),
      emitProviderSelected: jest.fn(),
      emitResponseStreaming: jest.fn(),
      startResponseProgressHeartbeat: jest.fn().mockReturnValue(jest.fn()),
      emitFallbackAttempt: jest.fn(),
      emitError: jest.fn(),
    };

    localModelSelection = {
      resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
      resolveModelList: jest.fn().mockResolvedValue(['qwen3:7b', 'llama3.3:8b']),
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
    expect(requestBody.options.num_predict).toBe(FAST_PATH_MAX_OUTPUT_TOKENS);
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
    // AUTO without fast-path no longer applies a default num_predict cap
    // — the manager passes `undefined` so the model decides when to stop
    // and the adapter omits the field. Only an explicit thread.maxTokens
    // setting reintroduces a cap (bounded by HARD_MAX_OUTPUT_TOKENS).
    expect(requestBody.options.num_predict).toBeUndefined();
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

  it('routes local-ollama models through the local Ollama runtime path', async () => {
    const context = makeContext('compare local ollama behavior');
    const now = Date.now();

    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 201,
      data: {
        model: 'glm4:latest',
        response: 'local response',
        done: true,
        promptEvalCount: 9,
        evalCount: 6,
      },
    });

    const result = await manager.callProvider(
      'local-ollama',
      'glm4:latest',
      context,
      now,
      false,
      undefined,
      'MANUAL_MODEL',
      { fastPathEnabled: false, maxOutputTokens: 128, applyShortResponseConstraint: false },
    );

    expect(result.provider).toBe('local-ollama');
    expect(result.model).toBe('glm4:latest');
    expect(httpRequest).toHaveBeenCalledTimes(1);
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://ollama:4008/api/v1/ollama/generate',
        method: 'POST',
      }),
    );
    const requestBody = httpRequest.mock.calls[0][0].body as {
      model: string;
      prompt: string;
    };
    expect(requestBody.model).toBe('glm4:latest');
    expect(requestBody.prompt).toContain('user prompt');
  });

  it('routes Ollama connector models through the cloud transport path', async () => {
    const context = makeContext('compare cloud ollama behavior');
    const now = Date.now();

    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          provider: 'OLLAMA',
          apiKey: 'ollama-cloud-key',
          baseUrl: 'http://localhost:11434',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'deepseek-v3.2',
          message: { role: 'assistant', content: 'cloud response' },
          done: true,
          done_reason: 'stop',
          prompt_eval_count: 11,
          eval_count: 7,
        },
      });

    const result = await manager.callProvider(
      'OLLAMA',
      'deepseek-v3.2',
      context,
      now,
      false,
      undefined,
      'MANUAL_MODEL',
      { fastPathEnabled: false, maxOutputTokens: 128, applyShortResponseConstraint: false },
    );

    expect(result.provider).toBe('OLLAMA');
    expect(result.model).toBe('deepseek-v3.2');
    expect(httpRequest).toHaveBeenCalledTimes(2);
    expect(httpRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: 'http://connector:4011/api/v1/internal/connectors/config?provider=OLLAMA',
        method: 'GET',
      }),
    );
    expect(httpRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: 'https://ollama.com/api/chat',
        method: 'POST',
        headers: { Authorization: 'Bearer ollama-cloud-key' },
      }),
    );
    const requestBody = httpRequest.mock.calls[1][0].body as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      options: { num_predict: number };
    };
    expect(requestBody.model).toBe('deepseek-v3.2');
    expect(requestBody.messages).toHaveLength(1);
    expect(requestBody.messages[0]?.content).toContain('Explain this briefly');
    expect(requestBody.options.num_predict).toBe(128);
  });

  it('does not fall back to another model for manual selection failures', async () => {
    const context = makeContext('compare deepseek cloud behavior');
    httpRequest.mockResolvedValueOnce({
      ok: false,
      status: 500,
      data: { message: 'Request failed with status code 401' },
    });

    await expect(
      manager.execute(
        {
          messageId: 'msg-manual-fail',
          threadId: 'thread-1',
          selectedProvider: 'OLLAMA',
          selectedModel: 'deepseek-v3.2:cloud',
          routingMode: 'MANUAL_MODEL',
          timestamp: new Date().toISOString(),
        },
        context,
      ),
    ).rejects.toThrow('Request failed with status code 401');

    expect(httpRequest).toHaveBeenCalledTimes(1);
  });

  it('prefers local file-generation models before cloud providers', async () => {
    const context = makeContext(
      'Generate a DOCX board brief for an enterprise SOC 2 launch with risks and owners.',
    );
    const now = Date.now();

    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        data: {
          model: 'qwen3:7b',
          response: '# Board Brief\n\n- Risk: Vendor due diligence\n- Owner: Security',
          done: true,
          promptEvalCount: 18,
          evalCount: 64,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        data: {
          generationId: 'file-gen-1',
          status: 'QUEUED',
          format: 'DOCX',
        },
      });

    const result = await manager.callProvider('FILE_GENERATION', 'auto', context, now, false);

    expect(localModelSelection.resolveModelList).toHaveBeenCalledWith(3, 'LOCAL_FILE_GENERATION');
    expect(httpRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: 'http://ollama:4008/api/v1/ollama/generate',
        method: 'POST',
      }),
    );
    expect(httpRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: 'http://file-generation:4013/api/v1/internal/file-generations/generate',
        method: 'POST',
      }),
    );

    const ollamaBody = httpRequest.mock.calls[0][0].body as {
      model: string;
      options: { num_predict: number };
    };
    expect(ollamaBody.model).toBe('qwen3:7b');
    // file-gen path uses the HARD cap when thread.maxTokens is undefined.
    expect(ollamaBody.options.num_predict).toBe(HARD_MAX_OUTPUT_TOKENS);

    const fileGenerationBody = httpRequest.mock.calls[1][0].body as {
      provider: string;
      model: string;
      format: string;
    };
    expect(fileGenerationBody.provider).toBe('local-ollama');
    expect(fileGenerationBody.model).toBe('qwen3:7b');
    expect(fileGenerationBody.format).toBe('DOCX');

    expect(result.provider).toBe('FILE_GENERATION');
    expect(result.model).toBe('auto');
    expect(result.fileGenerationId).toBe('file-gen-1');
    expect(result.usedFallback).toBe(false);
  });

  it('falls back to the next file content provider when the first local model fails', async () => {
    const context = makeContext(
      'Generate a PDF project status report with milestones and blockers.',
    );
    const now = Date.now();

    httpRequest
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        data: { message: 'first local file model failed' },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        data: {
          model: 'llama3.3:8b',
          response: '# Status Report\n\n- Milestone: Complete\n- Blocker: None',
          done: true,
          promptEvalCount: 22,
          evalCount: 71,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        data: {
          generationId: 'file-gen-2',
          status: 'QUEUED',
          format: 'PDF',
        },
      });

    const result = await manager.callProvider('FILE_GENERATION', 'auto', context, now, false);

    expect(httpRequest).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        url: 'http://ollama:4008/api/v1/ollama/generate',
        method: 'POST',
      }),
    );
    expect(httpRequest).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        url: 'http://ollama:4008/api/v1/ollama/generate',
        method: 'POST',
      }),
    );
    expect(httpRequest).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        url: 'http://file-generation:4013/api/v1/internal/file-generations/generate',
        method: 'POST',
      }),
    );

    const retryOllamaBody = httpRequest.mock.calls[1][0].body as {
      model: string;
      options: { num_predict: number };
    };
    expect(retryOllamaBody.model).toBe('llama3.3:8b');
    expect(retryOllamaBody.options.num_predict).toBe(HARD_MAX_OUTPUT_TOKENS);

    const fileGenerationBody = httpRequest.mock.calls[2][0].body as {
      provider: string;
      model: string;
    };
    expect(fileGenerationBody.provider).toBe('local-ollama');
    expect(fileGenerationBody.model).toBe('llama3.3:8b');

    expect(result.fileGenerationId).toBe('file-gen-2');
    expect(result.usedFallback).toBe(true);
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
      originalResponse: {
        content: 'All good.',
        provider: 'local-ollama',
        model: 'AUTO',
        latencyMs: 120,
        usedFallback: false,
      },
      criticEvaluation: {
        feedback: [],
        score: 0.9,
        category: 'generic',
        model: 'OPENAI/gpt-4o-mini',
        latencyMs: 100,
      },
      judgeVerdict: {
        decision: JudgeDecision.ACCEPT,
        summary: 'Verified',
        reasoning: 'Looks good',
        confidence: 0.9,
        response: 'The answer passed review.',
        responseType: 'verification_note',
        recommendedChanges: [],
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

  it('returns the judge escalated answer when escalation produces a stronger response', async () => {
    const context = makeContext('status?');
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        model: 'qwen3:1.7b',
        response: 'Weak answer.',
        done: true,
      },
    });

    judgeManager.shouldActivate = jest.fn().mockReturnValue(true);
    judgeManager.evaluate = jest.fn().mockResolvedValue({
      originalResponse: {
        content: 'Weak answer.',
        provider: 'local-ollama',
        model: 'AUTO',
        latencyMs: 120,
        usedFallback: false,
      },
      criticEvaluation: {
        feedback: ['Incomplete answer'],
        score: 0.3,
        category: 'generic',
        model: 'OPENAI/gpt-4o-mini',
        latencyMs: 100,
      },
      judgeVerdict: {
        decision: JudgeDecision.ESCALATE,
        summary: 'Escalate',
        reasoning: 'The answer is too weak.',
        confidence: 0.92,
        response: 'Here is a stronger answer.',
        responseType: 'escalated_answer',
        recommendedChanges: ['Answer directly'],
        model: 'local-ollama/AUTO',
        latencyMs: 80,
      },
      escalatedResponse: {
        content: 'Here is a stronger answer.',
        provider: 'local-ollama',
        model: 'AUTO',
        latencyMs: 80,
        usedFallback: false,
      },
      totalLatencyMs: 180,
      revisedResponse: undefined,
    });

    const result = await manager.execute(
      {
        messageId: 'msg-4',
        threadId: 'thread-1',
        selectedProvider: 'local-ollama',
        selectedModel: 'AUTO',
        routingMode: 'AUTO',
        judgeEnabled: true,
        timestamp: new Date().toISOString(),
      },
      context,
    );

    expect(result.content).toBe('Here is a stronger answer.');
    expect(judgeManager.buildMetadata).toHaveBeenCalledTimes(1);
  });

  describe('LLAMACPP frontier dispatch', () => {
    beforeEach(() => {
      AppConfig.get.mockReturnValue({
        OLLAMA_SERVICE_URL: 'http://ollama:4008',
        OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
        CONNECTOR_SERVICE_URL: 'http://connector:4011',
        FILE_GENERATION_SERVICE_URL: 'http://file-generation:4013',
        LLAMACPP_SERVICE_URL: 'http://llamacpp-service:4017',
      });
    });

    it('routes provider="local-llamacpp" to llamacpp-service inference endpoint', async () => {
      const context = makeContext('Hello frontier model');
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          id: 'chatcmpl-llama-1',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hello back from llama.cpp' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 8, completion_tokens: 6 },
        },
      });

      const result = await manager.execute(
        {
          messageId: 'msg-llama-1',
          threadId: 'thread-1',
          selectedProvider: 'local-llamacpp',
          selectedModel: 'glm-5.1:Q4_K_M',
          routingMode: 'MANUAL_MODEL',
          timestamp: new Date().toISOString(),
        },
        context,
      );

      expect(result.content).toBe('Hello back from llama.cpp');
      expect(result.provider).toBe('local-llamacpp');
      expect(result.model).toBe('glm-5.1:Q4_K_M');

      const url = httpRequest.mock.calls[0][0].url as string;
      expect(url).toBe('http://llamacpp-service:4017/api/v1/v1/chat/completions');
    });

    it('routes provider="LLAMACPP" connector to llamacpp-service inference endpoint', async () => {
      const context = makeContext('via connector');
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          id: 'chatcmpl-llama-2',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'response' },
              finish_reason: 'stop',
            },
          ],
        },
      });

      const result = await manager.execute(
        {
          messageId: 'msg-llama-2',
          threadId: 'thread-1',
          selectedProvider: 'LLAMACPP',
          selectedModel: 'kimi-k2:Q3_K',
          routingMode: 'MANUAL_MODEL',
          timestamp: new Date().toISOString(),
        },
        context,
      );

      expect(result.content).toBe('response');
      const url = httpRequest.mock.calls[0][0].url as string;
      expect(url).toContain('/api/v1/v1/chat/completions');
    });

    it('throws LLAMACPP_REQUEST_FAILED when llamacpp returns non-2xx', async () => {
      const context = makeContext('frontier prompt');
      httpRequest.mockResolvedValue({
        ok: false,
        status: 503,
        data: { code: 'NO_MODEL_LOADED', message: 'No model loaded' },
      });

      await expect(
        manager.execute(
          {
            messageId: 'msg-llama-3',
            threadId: 'thread-1',
            selectedProvider: 'local-llamacpp',
            selectedModel: 'glm-5.1:Q4_K_M',
            routingMode: 'MANUAL_MODEL',
            timestamp: new Date().toISOString(),
          },
          context,
        ),
      ).rejects.toThrow(/No model loaded|LLAMACPP_REQUEST_FAILED|llama\.cpp/);
    });

    it('does NOT call connector-service for LLAMACPP (no API key needed)', async () => {
      const context = makeContext('hi');
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          choices: [
            { index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' },
          ],
        },
      });

      await manager.execute(
        {
          messageId: 'msg-llama-4',
          threadId: 'thread-1',
          selectedProvider: 'local-llamacpp',
          selectedModel: 'glm-5.1:Q4_K_M',
          routingMode: 'MANUAL_MODEL',
          timestamp: new Date().toISOString(),
        },
        context,
      );

      const calls = httpRequest.mock.calls.map((call) => call[0].url as string);
      expect(calls.some((url) => url.includes('/connectors/config'))).toBe(false);
    });
  });
});
