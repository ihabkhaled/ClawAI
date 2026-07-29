import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AccessControlService } from '../services/access-control.service';
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

// Default AppConfig fixture used by EVERY test. Re-applied inside the
// beforeEach (after `jest.clearAllMocks()` wipes mock state) so the new
// OLLAMA_TOOL_LOOP_* caps survive the reset. Without this, the agentic
// loop reads `undefined` and every cloud-Ollama test fails with
// "No API key configured for provider OLLAMA" because the iteration cap
// is undefined and the while-loop short-circuits.
const DEFAULT_APP_CONFIG = {
  OLLAMA_SERVICE_URL: 'http://ollama:4008',
  OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
  CONNECTOR_SERVICE_URL: 'http://connector:4011',
  FILE_GENERATION_SERVICE_URL: 'http://file-generation:4013',
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 50,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
};
AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);

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
    // Re-pin the AppConfig mock — clearAllMocks wipes the module-scope
    // default set above, and several methods (runOllamaCloudToolLoop in
    // particular) call AppConfig.get() many times per invocation.
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);

    contextAssembly = {
      buildPromptString: jest.fn().mockReturnValue('user prompt'),
      buildChatMessages: jest
        .fn()
        .mockReturnValue([{ role: 'user', content: 'Explain this briefly' }]),
      buildGeminiChatMessages: jest
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
      // Phase 6 — SearchFirstManager. Default mock returns "not applied"
      // so tests that don't set selectedWorkflow=SEARCH_FIRST keep their
      // existing behaviour.
      {
        run: jest.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
          context: ctx,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as any,
      { recordUsage: jest.fn() } as unknown as AccessControlService,
      // Slice D — Gemini Files API manager. Default mock matches the
      // ENABLE_GEMINI_FILES_API=false path (no uploads), so no test should
      // hit it unless it explicitly flips the flag.
      {
        uploadFile: jest.fn(),
        getCachedOrUpload: jest.fn(),
      } as any,
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
    // Bug-hunt 2026-05-31, Fix 3 — AUTO-no-fast-path used to send
    // `num_predict: undefined` so the local runtime silently truncated at
    // its own ctx ceiling. The manager now computes a safe default from
    // (ctxSize - promptTokensEstimate - SAFETY_MARGIN), so `num_predict`
    // is always a positive integer. Floor is MIN_OUTPUT_TOKENS=512.
    expect(requestBody.options.num_predict).toBeGreaterThanOrEqual(512);
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

  it('routes an AUTO video attachment to Gemini and sends native video data', async () => {
    const videoPrompt =
      'Provide a comprehensive frame-by-frame analysis of this video and identify important events.';
    const context = makeContext(videoPrompt);
    const videoBase64 = Buffer.from('video-bytes').toString('base64');
    context.fileContents = [
      {
        id: 'video-1',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        content: videoBase64,
      },
    ];
    contextAssembly.buildGeminiChatMessages?.mockReturnValue([
      {
        role: 'user',
        content: [
          { type: 'text', text: videoPrompt },
          {
            type: 'image_url',
            image_url: { url: `data:video/mp4;base64,${videoBase64}` },
          },
        ],
      },
    ]);
    AppConfig.get.mockReturnValue({
      ...DEFAULT_APP_CONFIG,
      ENABLE_GEMINI_FILES_API: false,
      GEMINI_FILES_API_SIZE_THRESHOLD_BYTES: 10_000,
    });
    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          provider: 'GEMINI',
          apiKey: 'gemini-key',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: 'The clip shows a demo.' }],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            promptTokenCount: 12,
            candidatesTokenCount: 7,
            totalTokenCount: 19,
          },
        },
      });

    const result = await manager.execute(
      {
        messageId: 'msg-video',
        threadId: 'thread-1',
        selectedProvider: 'local-ollama',
        selectedModel: 'qwen3:1.7b',
        routingMode: 'AUTO',
        fallbackChain: [{ provider: 'OPENAI', model: 'gpt-4o' }],
        timestamp: new Date().toISOString(),
      },
      context,
    );

    expect(result.provider).toBe('GEMINI');
    expect(result.model).toBe('gemini-2.5-flash');
    expect(result.content).toBe('The clip shows a demo.');
    expect(httpRequest).toHaveBeenCalledTimes(2);
    expect(httpRequest.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        headers: { 'x-goog-api-key': 'gemini-key' },
      }),
    );
    const providerRequest = httpRequest.mock.calls[1][0].body as {
      contents: Array<{
        parts: Array<{
          inline_data?: { mime_type: string; data: string };
        }>;
      }>;
    };
    expect(providerRequest.contents[0]?.parts[1]?.inline_data).toEqual({
      mime_type: 'video/mp4',
      data: videoBase64,
    });
    expect(providerRequest).not.toHaveProperty('messages');
    expect(providerRequest).not.toHaveProperty('model');
    expect(providerRequest).not.toHaveProperty('stream');
  });

  it('cancels a buffered Gemini generate request without attempting the fallback chain', async () => {
    const cancellationController = new AbortController();
    const runSimulated = jest.fn();
    const simulatedExecutor = { runSimulated };
    const releaseCancellation = jest.fn();
    const cancellation = {
      register: jest.fn().mockReturnValue(cancellationController),
      release: releaseCancellation,
    };
    const cancellableManager = new ChatExecutionManager(
      contextAssembly as unknown as ContextAssemblyManager,
      qualityManager as unknown as QualityCheckManager,
      judgeManager as unknown as JudgeRefereeManager,
      streamService as unknown as ChatStreamService,
      {
        run: jest.fn().mockImplementation(async (_query: string, requestContext: unknown) => ({
          context: requestContext,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as unknown as ConstructorParameters<typeof ChatExecutionManager>[4],
      { recordUsage: jest.fn() } as unknown as AccessControlService,
      {
        uploadFile: jest.fn(),
        getCachedOrUpload: jest.fn(),
      } as unknown as ConstructorParameters<typeof ChatExecutionManager>[6],
      localModelSelection as unknown as LocalModelSelectionService,
      simulatedExecutor as unknown as ConstructorParameters<typeof ChatExecutionManager>[8],
      cancellation as unknown as ConstructorParameters<typeof ChatExecutionManager>[9],
    );
    AppConfig.get.mockReturnValue({
      ...DEFAULT_APP_CONFIG,
      ENABLE_GEMINI_FILES_API: true,
      GEMINI_FILES_API_SIZE_THRESHOLD_BYTES: 10_000,
    });
    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          provider: 'GEMINI',
          apiKey: 'gemini-key',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        },
      })
      .mockImplementationOnce(async (options: { signal?: AbortSignal }) => {
        if (options.signal?.aborted === true) {
          throw new Error('aborted');
        }
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
            once: true,
          });
        });
      });

    const execution = cancellableManager.execute(
      {
        messageId: 'msg-cancel',
        threadId: 'thread-cancel',
        selectedProvider: 'GEMINI',
        selectedModel: 'gemini-2.5-flash',
        routingMode: 'MANUAL_MODEL',
        fallbackChain: [{ provider: 'OPENAI', model: 'gpt-4o' }],
        timestamp: new Date().toISOString(),
      },
      makeContext('Describe the attached media.'),
    );
    cancellationController.abort();

    await expect(execution).rejects.toMatchObject({ code: 'STREAM_CANCELLED' });
    expect(httpRequest).toHaveBeenCalledTimes(2);
    expect(streamService.emitFallbackAttempt).not.toHaveBeenCalled();
    expect(runSimulated).not.toHaveBeenCalled();
    expect(releaseCancellation).toHaveBeenCalledWith('thread-cancel');
  });

  it('rejects a manually selected non-video provider before making a request', async () => {
    const context = makeContext('Describe this video.');
    context.fileContents = [
      {
        id: 'video-1',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        content: Buffer.from('video').toString('base64'),
      },
    ];

    await expect(
      manager.execute(
        {
          messageId: 'msg-video',
          threadId: 'thread-1',
          selectedProvider: 'OPENAI',
          selectedModel: 'gpt-4o',
          routingMode: 'MANUAL_MODEL',
          timestamp: new Date().toISOString(),
        },
        context,
      ),
    ).rejects.toThrow('OPENAI/gpt-4o cannot process video attachments');
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it.each(['LOCAL_ONLY', 'PRIVACY_FIRST'])(
    'rejects video in %s mode instead of falling back to a cloud provider',
    async (routingMode) => {
      const context = makeContext('Describe this video.');
      context.fileContents = [
        {
          id: 'video-1',
          filename: 'demo.mp4',
          mimeType: 'video/mp4',
          content: Buffer.from('video').toString('base64'),
        },
      ];

      await expect(
        manager.execute(
          {
            messageId: 'msg-video',
            threadId: 'thread-1',
            selectedProvider: 'local-ollama',
            selectedModel: 'qwen3:1.7b',
            routingMode,
            fallbackChain: [{ provider: 'GEMINI', model: 'gemini-2.5-flash' }],
            timestamp: new Date().toISOString(),
          },
          context,
        ),
      ).rejects.toThrow(`Video attachments cannot be processed in ${routingMode} mode`);
      expect(httpRequest).not.toHaveBeenCalled();
    },
  );

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

  // Bug-hunt 2026-05-31 — Ollama mid-sentence truncation. These tests pin
  // the contract that `done_reason` from Ollama is propagated faithfully
  // into LlmResponse.finishReason instead of being squashed to 'stop'.
  // Without these tests the regression slips back in any time someone
  // touches buildOllamaResponse.
  describe('Ollama done_reason propagation (truncation telemetry)', () => {
    it('returns finishReason="length" when Ollama signals length cap', async () => {
      const context = makeContext('long research prompt that fills context');
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'deepseek-v4-pro',
          response: 'Mid-sentence answer that got cut off because ctx',
          done: true,
          done_reason: 'length',
          promptEvalCount: 5800,
          evalCount: 256,
        },
      });

      const result = await manager.callProvider(
        'local-ollama',
        'deepseek-v4-pro',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 256, applyShortResponseConstraint: false },
      );

      expect(result.finishReason).toBe('length');
    });

    it('returns finishReason="stop" when Ollama signals a clean stop', async () => {
      const context = makeContext('short prompt');
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'deepseek-v4-pro',
          response: 'All good.',
          done: true,
          done_reason: 'stop',
          promptEvalCount: 5,
          evalCount: 3,
        },
      });

      const result = await manager.callProvider(
        'local-ollama',
        'deepseek-v4-pro',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 256, applyShortResponseConstraint: false },
      );

      expect(result.finishReason).toBe('stop');
    });

    it('falls back to finishReason="stop" when done_reason is absent but done=true', async () => {
      const context = makeContext('short prompt');
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'deepseek-v4-pro',
          response: 'All good.',
          done: true,
          promptEvalCount: 5,
          evalCount: 3,
        },
      });

      const result = await manager.callProvider(
        'local-ollama',
        'deepseek-v4-pro',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 256, applyShortResponseConstraint: false },
      );

      expect(result.finishReason).toBe('stop');
    });
  });

  // Bug-hunt 2026-05-31 — universal truncation telemetry, buffered paths.
  // The user reported the Ollama Cloud Connector with deepseek-v4-pro was
  // also truncating mid-sentence. Verifies that BOTH cloud parsers
  // (parseCloudResponse for OpenAI-compat shim providers AND
  // parseOllamaChatResponse for the OLLAMA connector's native /api/chat
  // shape) round-trip the truncation signal into LlmResponse.finishReason
  // so the universal truncatedAtContextLimit metadata flag fires for
  // every provider, not just local Ollama.
  describe('Cloud truncation propagation (truncation telemetry, buffered)', () => {
    it('parseGeminiResponse: maps finishReason="MAX_TOKENS" to the shared "length" signal', async () => {
      const context = makeContext('long Gemini prompt');
      AppConfig.get.mockReturnValue({
        ...DEFAULT_APP_CONFIG,
        ENABLE_GEMINI_FILES_API: true,
        GEMINI_FILES_API_SIZE_THRESHOLD_BYTES: 10_000,
      });
      httpRequest
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            provider: 'GEMINI',
            apiKey: 'gemini-key',
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [{ text: 'A Gemini answer cut at the token limit' }],
                },
                finishReason: 'MAX_TOKENS',
              },
            ],
            usageMetadata: {
              promptTokenCount: 5800,
              candidatesTokenCount: 256,
              totalTokenCount: 6056,
            },
          },
        });

      const result = await manager.callProvider(
        'GEMINI',
        'gemini-2.5-flash',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 256, applyShortResponseConstraint: false },
      );

      expect(result.finishReason).toBe('length');
    });

    it('parseCloudResponse: round-trips finish_reason="length" for OpenAI-compat cloud providers', async () => {
      const context = makeContext('long openai prompt');
      httpRequest
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { provider: 'OPENAI', apiKey: 'k', baseUrl: 'https://api.openai.com/v1' },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            id: 'chatcmpl-trunc',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Mid-sentence answer that was cut' },
                finish_reason: 'length',
              },
            ],
            usage: { prompt_tokens: 5800, completion_tokens: 256, total_tokens: 6056 },
          },
        });

      const result = await manager.callProvider(
        'OPENAI',
        'gpt-4o',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 256, applyShortResponseConstraint: false },
      );

      expect(result.finishReason).toBe('length');
    });

    it('parseOllamaChatResponse: round-trips done_reason="length" for the OLLAMA cloud connector (deepseek-v4-pro)', async () => {
      const context = makeContext('long deepseek prompt');
      httpRequest
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { provider: 'OLLAMA', apiKey: 'k', baseUrl: 'http://localhost:11434' },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            model: 'deepseek-v4-pro',
            message: { role: 'assistant', content: 'Mid-sentence cloud answer that got cut' },
            done: true,
            done_reason: 'length',
            prompt_eval_count: 5800,
            eval_count: 256,
          },
        });

      const result = await manager.callProvider(
        'OLLAMA',
        'deepseek-v4-pro',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 256, applyShortResponseConstraint: false },
      );

      expect(result.finishReason).toBe('length');
    });
  });

  describe('Ollama Cloud agentic tool loop', () => {
    it('passes through with no toolTranscript when the model emits no tool_calls', async () => {
      const context = makeContext('plain prompt with no web access required');
      httpRequest
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { provider: 'OLLAMA', apiKey: 'k', baseUrl: 'http://localhost:11434' },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            model: 'deepseek-v4-pro',
            message: { role: 'assistant', content: 'Direct answer, no tools needed.' },
            done: true,
            done_reason: 'stop',
            prompt_eval_count: 12,
            eval_count: 7,
          },
        });

      const result = await manager.callProvider(
        'OLLAMA',
        'deepseek-v4-pro',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 128, applyShortResponseConstraint: false },
      );

      expect(result.content).toBe('Direct answer, no tools needed.');
      expect(result.toolTranscript).toBeUndefined();
      expect(httpRequest).toHaveBeenCalledTimes(2);
      const firstChatBody = httpRequest.mock.calls[1][0].body as {
        tools?: Array<{ type: string; function: { name: string } }>;
      };
      expect(firstChatBody.tools?.map((t) => t.function.name)).toEqual(['web_search', 'web_fetch']);
    });

    it('runs a single tool turn and re-POSTs with the tool result', async () => {
      const context = makeContext('what is the latest react version?');
      httpRequest
        // 1: connector config
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { provider: 'OLLAMA', apiKey: 'k', baseUrl: 'http://localhost:11434' },
        })
        // 2: first /api/chat — model emits a tool_call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            model: 'deepseek-v4-pro',
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [
                {
                  id: 'tool-1',
                  function: { name: 'web_search', arguments: { query: 'react latest version' } },
                },
              ],
            },
            done: false,
          },
        })
        // 3: /api/web_search — tool result
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: { results: [{ title: 'React 19', content: 'React 19 released' }] },
        })
        // 4: second /api/chat — final answer, no more tool_calls
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            model: 'deepseek-v4-pro',
            message: {
              role: 'assistant',
              content: 'React 19 is the latest release.',
            },
            done: true,
            done_reason: 'stop',
            prompt_eval_count: 22,
            eval_count: 9,
          },
        });

      const result = await manager.callProvider(
        'OLLAMA',
        'deepseek-v4-pro',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 256, applyShortResponseConstraint: false },
      );

      expect(result.content).toBe('React 19 is the latest release.');
      expect(result.toolTranscript).toBeDefined();
      expect(result.toolTranscript?.turns).toHaveLength(1);
      expect(result.toolTranscript?.turns[0]).toMatchObject({
        turn: 1,
        tool: 'web_search',
        ok: true,
      });
      expect(result.toolTranscript?.iterations).toBe(2);
      expect(result.toolTranscript?.capReached).toBe(false);

      // The web_search call was dispatched to the dedicated endpoint.
      // resolveOllamaConnectorBaseUrl pins the cloud connector baseUrl to
      // 'https://ollama.com/api' regardless of what the connector record
      // stores, so tool dispatch lands there too.
      const toolUrl = httpRequest.mock.calls[2][0].url as string;
      expect(toolUrl).toBe('https://ollama.com/api/web_search');

      // The follow-up chat carries the tool result as a `tool` message.
      const secondChatBody = httpRequest.mock.calls[3][0].body as {
        messages: Array<{ role: string; content: string; tool_call_id?: string }>;
      };
      const toolMessage = secondChatBody.messages.find((m) => m.role === 'tool');
      expect(toolMessage).toBeDefined();
      expect(toolMessage?.content).toContain('React 19');
      expect(toolMessage?.tool_call_id).toBe('tool-1');
    });

    it('bails with capReached=true AND gracefully wraps up when the model never stops calling tools', async () => {
      // Pin the iteration cap to 10 for THIS test so the existing
      // assertion arithmetic stays readable (the canonical runtime cap is
      // now 50). The graceful wrap-up POST adds ONE extra non-tool /chat
      // call after the iteration cap is hit, then synthesizes the answer.
      // mockReturnValue (not mockReturnValueOnce) is used because
      // AppConfig.get() is called many times per `callProvider` invocation
      // (resolveProviderConfig + callCloudProvider + the loop itself + …).
      AppConfig.get.mockReturnValue({
        OLLAMA_SERVICE_URL: 'http://ollama:4008',
        OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
        CONNECTOR_SERVICE_URL: 'http://connector:4011',
        FILE_GENERATION_SERVICE_URL: 'http://file-generation:4013',
        OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 10,
        OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
      });
      const context = makeContext('infinite-loop scenario');
      // 1 connector config
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { provider: 'OLLAMA', apiKey: 'k', baseUrl: 'http://localhost:11434' },
      });
      // Each /api/chat turn returns a tool_call; the matching /api/web_search
      // returns an empty result. With OLLAMA_TOOL_LOOP_MAX_ITERATIONS=10 and
      // (chat + tool) per turn we expect 1 (config) + 10 (chat) + 10 (tool)
      // + 1 (graceful wrap-up POST) = 22 calls.
      for (let i = 0; i < 10; i += 1) {
        httpRequest
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            data: {
              model: 'deepseek-v4-pro',
              message: {
                role: 'assistant',
                content: '',
                tool_calls: [
                  {
                    id: `t-${String(i)}`,
                    function: { name: 'web_search', arguments: { query: 'loop' } },
                  },
                ],
              },
              done: false,
            },
          })
          .mockResolvedValueOnce({ ok: true, status: 200, data: { results: [] } });
      }
      // Graceful wrap-up — final tool-less POST that synthesizes an answer.
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'deepseek-v4-pro',
          message: {
            role: 'assistant',
            content: 'Based on the available evidence I could not produce a definitive answer.',
          },
          done: true,
          done_reason: 'stop',
        },
      });

      const result = await manager.callProvider(
        'OLLAMA',
        'deepseek-v4-pro',
        context,
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        { fastPathEnabled: false, maxOutputTokens: 128, applyShortResponseConstraint: false },
      );

      expect(result.toolTranscript).toBeDefined();
      expect(result.toolTranscript?.capReached).toBe(true);
      expect(result.toolTranscript?.gracefullyWrapped).toBe(true);
      expect(result.toolTranscript?.iterations).toBe(10);
      // The synthesized wrap-up content surfaces verbatim as the assistant
      // message, no longer a generic "safety cap" error string.
      expect(result.content).toBe(
        'Based on the available evidence I could not produce a definitive answer.',
      );
      // The wrap-up POST does NOT include `tools` so the model is forced
      // to text. Inspect the last httpRequest call's body to confirm.
      const wrapUpCall = httpRequest.mock.calls.at(-1)?.[0] as {
        body: { tools?: unknown; messages: Array<{ role: string; content: string }> };
      };
      expect(wrapUpCall.body.tools).toBeUndefined();
      // The final message MUST be the synthesized-instruction system note
      // so the model knows the research budget is exhausted.
      const lastMessage = wrapUpCall.body.messages.at(-1);
      expect(lastMessage?.role).toBe('system');
      expect(lastMessage?.content).toContain('maximum allowed research budget');
      // 1 (connector) + 10 (chat) + 10 (web_search) + 1 (wrap-up) = 22 calls
      expect(httpRequest).toHaveBeenCalledTimes(22);
    });
  });
});
