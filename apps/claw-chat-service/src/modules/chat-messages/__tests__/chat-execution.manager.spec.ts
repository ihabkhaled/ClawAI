import { type Mock, vi } from 'vitest';
import { BusinessException } from '../../../common/errors';
import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AccessControlService } from '../services/access-control.service';
import type { AssembledContext } from '../types/context.types';
import type { AttemptRecord } from '../types/fallback-executor.types';
import { JudgeDecision } from '../../../common/enums';
// Import the live caps so the test moves with the constants rather than
// pinning brittle numeric literals — previously the test asserted
// num_predict === 112 which broke the moment we raised the AUTO cap to
// stop truncating compare-mode responses mid-word.
import {
  FAST_PATH_MAX_OUTPUT_TOKENS,
  HARD_MAX_OUTPUT_TOKENS,
} from '../constants/execution-fast-path.constants';
import { FileWriterCandidatesClient } from '../clients/file-writer-candidates.client';
import {
  asAccessControlService,
  createFakePaygAccessControl,
} from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return {
      // Exposure is a network call to connector-service. These suites test
      // dispatch behaviour, not connectivity, so the deployment is exposed.
      isExposed: vi.fn().mockResolvedValue(true),
    };
  }),
}));
vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-token'),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined => {
    return !record
      ? undefined
      : (Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined);
  },
}));

const { httpRequest } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
};
// AppConfig exposes a STATIC get(); neither a bare automock nor importMock
// hands that same static back, so the spec configured one object while the code
// under test read another. A hoisted vi.fn keeps both on one mock.
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const AppConfig = { get: appConfigGet };

// Default AppConfig fixture used by EVERY test. Re-applied inside the
// beforeEach (after `vi.clearAllMocks()` wipes mock state) so the new
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
    researchEvidence: [],
    researchRequested: false,
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

describe('ChatExecutionManager', () => {
  let manager: ChatExecutionManager;
  let contextAssembly: Partial<Record<keyof ContextAssemblyManager, Mock>>;
  let qualityManager: Partial<Record<keyof QualityCheckManager, Mock>>;
  let judgeManager: Partial<Record<keyof JudgeRefereeManager, Mock>>;
  let streamService: Partial<Record<keyof ChatStreamService, Mock>>;
  let localModelSelection: Partial<Record<keyof LocalModelSelectionService, Mock>>;
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;

  beforeEach(() => {
    vi.clearAllMocks();
    // `clearAllMocks` drains call history but NOT the `mockResolvedValueOnce`
    // queue. Any test that returns early — a PAYG refusal now short-circuits the
    // candidate loop instead of trying every provider — leaves its unconsumed
    // once-values behind, and the NEXT test silently reads them instead of its
    // own. That is how a suite passes one test at a time and fails as a whole.
    httpRequest.mockReset();
    // Re-pin the AppConfig mock — clearAllMocks wipes the module-scope
    // default set above, and several methods (runOllamaCloudToolLoop in
    // particular) call AppConfig.get() many times per invocation.
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);

    contextAssembly = {
      buildPromptString: vi.fn().mockReturnValue('user prompt'),
      buildChatMessages: vi
        .fn()
        .mockReturnValue([{ role: 'user', content: 'Explain this briefly' }]),
      buildGeminiChatMessages: vi
        .fn()
        .mockReturnValue([{ role: 'user', content: 'Explain this briefly' }]),
    };

    qualityManager = {
      checkResponseQuality: vi.fn().mockReturnValue({ score: 0.9, reasons: [] }),
      shouldReRoute: vi.fn().mockReturnValue({ shouldReRoute: false }),
    };

    judgeManager = {
      setExecutionManager: vi.fn(),
      shouldActivate: vi.fn().mockReturnValue(false),
      evaluate: vi.fn(),
      buildMetadata: vi.fn().mockReturnValue({ judgeEnabled: true }),
    };

    streamService = {
      emitRouterStarted: vi.fn(),
      emitProviderSelected: vi.fn(),
      emitResponseStreaming: vi.fn(),
      startResponseProgressHeartbeat: vi.fn().mockReturnValue(vi.fn()),
      emitFallbackAttempt: vi.fn(),
      emitError: vi.fn(),
    };

    localModelSelection = {
      resolveDefaultModel: vi.fn().mockResolvedValue('qwen3:1.7b'),
      resolveModelList: vi.fn().mockResolvedValue(['qwen3:7b', 'llama3.3:8b']),
    };
    // Metered by default so the chokepoint's reserve/finalize path is the one
    // under test; a suite that wants the local-runtime path opts out.
    accessControl = createFakePaygAccessControl();

    manager = new ChatExecutionManager(
      contextAssembly as unknown as ContextAssemblyManager,
      qualityManager as unknown as QualityCheckManager,
      judgeManager as unknown as JudgeRefereeManager,
      streamService as unknown as ChatStreamService,
      // Phase 6 — SearchFirstManager. Default mock returns "not applied"
      // so tests that don't set selectedWorkflow=SEARCH_FIRST keep their
      // existing behaviour.
      {
        run: vi.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
          context: ctx,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as any,
      accessControl as unknown as AccessControlService,
      // Slice D — Gemini Files API manager. Default mock matches the
      // ENABLE_GEMINI_FILES_API=false path (no uploads), so no test should
      // hit it unless it explicitly flips the flag.
      {
        uploadFile: vi.fn(),
        getCachedOrUpload: vi.fn(),
      } as any,
      localModelSelection as unknown as LocalModelSelectionService,
    );
  });

  it('fails before provider execution when routing reports no reachable model', async () => {
    await expect(
      manager.execute(
        {
          messageId: 'msg-unavailable',
          threadId: 'thread-1',
          selectedProvider: 'UNAVAILABLE',
          selectedModel: 'NONE',
          routingMode: 'AUTO',
          timestamp: new Date().toISOString(),
        },
        makeContext('hi'),
      ),
    ).rejects.toMatchObject({ code: 'NO_REACHABLE_EXECUTION_MODEL' });
    expect(httpRequest).not.toHaveBeenCalled();
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

    const requestBodyCall = httpRequest.mock.calls[0];
    expect(requestBodyCall).toBeDefined();
    const requestBody = requestBodyCall?.[0].body as {
      think: boolean;
      options: { num_predict: number };
      prompt: string;
    };
    expect(requestBody.think).toBe(false);
    expect(requestBody.options.num_predict).toBe(FAST_PATH_MAX_OUTPUT_TOKENS);
    expect(requestBody.prompt).toContain('Respond briefly in 2-4 sentences');
  });

  // The fast path trims context to 1k tokens and caps output at 512: a turn
  // grounded in crawled pages lost the pages it was asked about.
  it('never uses the fast path on a turn carrying research evidence', async () => {
    const context: AssembledContext = {
      ...makeContext('status?'),
      researchEvidence: [
        { id: 'e1', title: 'Docs', url: 'https://docs.example.com/', snippet: 'x' },
      ] as never,
    };
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { model: 'qwen3:1.7b', response: 'All good, per the docs.', done: true },
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

    expect(result.fastPathUsed).toBe(false);
  });

  // A reasoning model spent the 512-token cap thinking and stopped after 65
  // characters (production, 2026-09-19). A cut-off answer is re-asked in full.
  it('escalates a fast-path answer that stopped at the length limit', async () => {
    const context = makeContext('status?');
    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'qwen3:1.7b',
          response: 'Based on the available models, the best one is',
          done: true,
          done_reason: 'length',
        },
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          model: 'qwen3:1.7b',
          response: 'Based on the available models, the best one is Gemini 3.6 Flash.',
          done: true,
          done_reason: 'stop',
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

    expect(httpRequest.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(result.content).toContain('Gemini 3.6 Flash.');
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

    const requestBodyCall = httpRequest.mock.calls[0];
    expect(requestBodyCall).toBeDefined();
    const requestBody = requestBodyCall?.[0].body as {
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
    const completionRequestCall = httpRequest.mock.calls[1];
    expect(completionRequestCall).toBeDefined();
    const completionRequest = completionRequestCall?.[0].body as {
      max_tokens: number;
      messages: Array<{ role: string; content: string }>;
    };
    expect(completionRequest.max_tokens).toBe(72);
    expect(completionRequest.messages[0]?.role).toBe('system');
    expect(completionRequest.messages[0]?.content).toContain('Respond briefly in 2-4 sentences');
  });

  // Multimodal batch 8 (changed on purpose): chat no longer overrides AUTO's
  // pick with a hardcoded Gemini model — routing-service ranks video-capable
  // models first. When AUTO lands on one, the bytes ride natively.
  it('sends native video data when AUTO routed the video to a video-capable Gemini model', async () => {
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
        selectedProvider: 'GEMINI',
        selectedModel: 'gemini-2.5-flash',
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
    const call = httpRequest.mock.calls[1];
    expect(call).toBeDefined();
    expect(call?.[0]).toEqual(
      expect.objectContaining({
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        headers: { 'x-goog-api-key': 'gemini-key' },
      }),
    );
    const providerRequestCall = httpRequest.mock.calls[1];
    expect(providerRequestCall).toBeDefined();
    const providerRequest = providerRequestCall?.[0].body as {
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
    const runSimulated = vi.fn();
    const simulatedExecutor = { runSimulated };
    const releaseCancellation = vi.fn();
    const cancellation = {
      register: vi.fn().mockReturnValue(cancellationController),
      release: releaseCancellation,
    };
    const cancellableManager = new ChatExecutionManager(
      contextAssembly as unknown as ContextAssemblyManager,
      qualityManager as unknown as QualityCheckManager,
      judgeManager as unknown as JudgeRefereeManager,
      streamService as unknown as ChatStreamService,
      {
        run: vi.fn().mockImplementation(async (_query: string, requestContext: unknown) => ({
          context: requestContext,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as unknown as ConstructorParameters<typeof ChatExecutionManager>[4],
      asAccessControlService(createFakePaygAccessControl()),
      {
        uploadFile: vi.fn(),
        getCachedOrUpload: vi.fn(),
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

  // Multimodal batch 8 (changed on purpose): this used to throw
  // VIDEO_ATTACHMENT_PROVIDER_UNSUPPORTED before any request. The user's model
  // now answers from the video's transcript + frames; the bytes never ride.
  it('answers with a manually selected non-video provider, never sending the video bytes', async () => {
    const context = makeContext('Describe this video.');
    const videoBase64 = Buffer.from('video').toString('base64');
    context.fileContents = [
      {
        id: 'video-1',
        filename: 'demo.mp4',
        mimeType: 'video/mp4',
        content: videoBase64,
      },
    ];
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
              message: { role: 'assistant', content: 'From the transcript: a demo.' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        },
      });

    const result = await manager.execute(
      {
        messageId: 'msg-video',
        threadId: 'thread-1',
        selectedProvider: 'OPENAI',
        selectedModel: 'gpt-4o',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
      },
      context,
    );

    expect(result.provider).toBe('OPENAI');
    expect(result.model).toBe('gpt-4o');
    expect(JSON.stringify(httpRequest.mock.calls)).not.toContain(
      `data:video/mp4;base64,${videoBase64}`,
    );
  });

  // Multimodal batch 8 (changed on purpose): this used to throw
  // VIDEO_ATTACHMENT_LOCAL_MODEL_UNAVAILABLE. The local model answers; the
  // cloud Gemini fallback is never tried for a local-only turn.
  it.each(['LOCAL_ONLY', 'PRIVACY_FIRST'])(
    'answers a video in %s mode on the local model, never on a cloud provider',
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
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 201,
        data: {
          model: 'qwen3:1.7b',
          response: 'local answer from the transcript',
          done: true,
          promptEvalCount: 9,
          evalCount: 6,
        },
      });

      const result = await manager.execute(
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
      );

      expect(result.provider).toBe('local-ollama');
      expect(JSON.stringify(httpRequest.mock.calls)).not.toContain('generativelanguage');
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
    const requestBodyCall = httpRequest.mock.calls[0];
    expect(requestBodyCall).toBeDefined();
    const requestBody = requestBodyCall?.[0].body as {
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
    const requestBodyCall = httpRequest.mock.calls[1];
    expect(requestBodyCall).toBeDefined();
    const requestBody = requestBodyCall?.[0].body as {
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

  // The admin's FILE_WRITER list comes first; it replaced three hard-coded
  // cloud models that failed the exposure gate when not exposed.
  it("asks the admin's FILE_WRITER model before any local model", async () => {
    vi.spyOn(FileWriterCandidatesClient.prototype, 'resolve').mockResolvedValue([
      {
        provider: 'OLLAMA_CLOUD',
        modelAlias: 'gpt-oss:120b',
        timeoutMs: 120_000,
        maxTokens: 8_192,
      },
    ]);
    const callProvider = vi.spyOn(manager, 'callProvider');
    httpRequest.mockResolvedValue({ ok: false, status: 500, data: {} });

    await manager
      .callProvider(
        'FILE_GENERATION',
        'auto',
        makeContext('Generate a PDF report'),
        Date.now(),
        false,
      )
      .catch(() => {});

    expect(callProvider.mock.calls[1]?.slice(0, 2)).toEqual(['OLLAMA', 'gpt-oss:120b']);
  });

  // F6 (ADR-119): a manual pick's model writes its own file first.
  it('asks the user-picked model before the FILE_WRITER list', async () => {
    vi.spyOn(FileWriterCandidatesClient.prototype, 'resolve').mockResolvedValue([
      { provider: 'OLLAMA_CLOUD', modelAlias: 'gemma4:31b', timeoutMs: 120_000, maxTokens: 8_192 },
    ]);
    const callProvider = vi.spyOn(manager, 'callProvider');
    httpRequest.mockResolvedValue({ ok: false, status: 500, data: {} });

    await manager
      .callProvider(
        'FILE_GENERATION',
        'auto',
        makeContext('make me an excel of monthly expenses'),
        Date.now(),
        false,
        undefined,
        'MANUAL_MODEL',
        {
          fastPathEnabled: false,
          applyShortResponseConstraint: false,
          fileWriters: { preferred: { provider: 'GEMINI', model: 'models/gemini-2.5-flash' } },
        },
      )
      .catch(() => {});

    expect(callProvider.mock.calls[1]?.slice(0, 2)).toEqual(['GEMINI', 'models/gemini-2.5-flash']);
    expect(callProvider.mock.calls[2]?.slice(0, 2)).toEqual(['OLLAMA', 'gemma4:31b']);
  });

  it('never hands a local-only file request to a hosted writer', async () => {
    vi.spyOn(FileWriterCandidatesClient.prototype, 'resolve').mockResolvedValue([
      { provider: 'OLLAMA_CLOUD', modelAlias: 'gemma4:31b', timeoutMs: 120_000, maxTokens: 8_192 },
    ]);
    const callProvider = vi.spyOn(manager, 'callProvider');
    httpRequest.mockResolvedValue({ ok: false, status: 500, data: {} });

    await manager
      .callProvider(
        'FILE_GENERATION',
        'auto',
        makeContext('export a CSV of the top 5 programming languages'),
        Date.now(),
        false,
        undefined,
        'LOCAL_ONLY',
        {
          fastPathEnabled: false,
          applyShortResponseConstraint: false,
          fileWriters: { localOnly: true },
        },
      )
      .catch(() => {});

    const writers = callProvider.mock.calls.slice(1).map((call) => call[0]);
    expect(writers).not.toContain('OLLAMA');
    expect(writers.every((provider) => provider === 'local-ollama')).toBe(true);
  });

  it('uses local file models when no admin FILE_WRITER is configured', async () => {
    vi.spyOn(FileWriterCandidatesClient.prototype, 'resolve').mockResolvedValue([]);
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

    const ollamaBodyCall = httpRequest.mock.calls[0];
    expect(ollamaBodyCall).toBeDefined();
    const ollamaBody = ollamaBodyCall?.[0].body as {
      model: string;
      options: { num_predict: number };
    };
    expect(ollamaBody.model).toBe('qwen3:7b');
    // file-gen path uses the HARD cap when thread.maxTokens is undefined.
    expect(ollamaBody.options.num_predict).toBe(HARD_MAX_OUTPUT_TOKENS);

    const fileGenerationBodyCall = httpRequest.mock.calls[1];
    expect(fileGenerationBodyCall).toBeDefined();
    const fileGenerationBody = fileGenerationBodyCall?.[0].body as {
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

  // ADR-110: the plan's daily AI-file allowance, reserved before the model
  // writes, consumed once the file is queued, released when it fails.
  // image-service's /internal/images routes are ServiceTokenGuard-protected
  // (they were @Public() — anyone who could reach the service could start a
  // billed generation for any userId). No header here = every chat image 401s.
  it('sends the inter-service token when asking image-service for an image', async () => {
    AppConfig.get.mockReturnValue({
      ...DEFAULT_APP_CONFIG,
      IMAGE_SERVICE_URL: 'http://image-service:4012',
    });
    httpRequest.mockResolvedValueOnce({
      ok: true,
      status: 201,
      data: {
        generationId: 'img-1',
        status: 'QUEUED',
        provider: 'IMAGE_OPENAI',
        model: 'gpt-image-1',
      },
    });

    const result = await manager.callProvider(
      'IMAGE_OPENAI',
      'gpt-image-1',
      makeContext('generate an image of a lighthouse'),
      Date.now(),
      false,
    );

    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://image-service:4012/api/v1/internal/images/generate',
        method: 'POST',
        headers: { Authorization: 'Service test-token' },
      }),
    );
    expect(result.imageGenerationId).toBe('img-1');
  });

  // ADR-122: image generation / edit is a paid feature. A free plan's image
  // turn is answered with a notice the chat translates — never a raw error —
  // and nothing is spent: no vision hop, no image-service call, no hold.
  describe('image generation plan gate', () => {
    it('answers a free plan with a plan refusal and never calls image-service', async () => {
      accessControl.hasPlanFeatureFor.mockResolvedValue(false);

      const result = await manager.callProvider(
        'IMAGE_OPENAI',
        'gpt-image-1',
        makeContext('generate an image of a lighthouse'),
        Date.now(),
        false,
      );

      expect(accessControl.hasPlanFeatureFor).toHaveBeenCalledWith(
        expect.any(String),
        'allowImageGeneration',
      );
      expect(result.planFeatureRefusal).toEqual({ feature: 'allowImageGeneration' });
      expect(result.imageGenerationId).toBeUndefined();
      expect(result.finishReason).toBe('stop');
      expect(httpRequest).not.toHaveBeenCalled();
      expect(accessControl.reserveCredit).not.toHaveBeenCalled();
    });

    it("turns image-service's own PLAN_FEATURE_DISABLED 403 into the same refusal", async () => {
      AppConfig.get.mockReturnValue({
        ...DEFAULT_APP_CONFIG,
        IMAGE_SERVICE_URL: 'http://image-service:4012',
      });
      httpRequest.mockResolvedValueOnce({
        ok: false,
        status: 403,
        data: { statusCode: 403, code: 'PLAN_FEATURE_DISABLED', message: 'Feature not available' },
      });

      const result = await manager.callProvider(
        'IMAGE_OPENAI',
        'gpt-image-1',
        makeContext('generate an image of a lighthouse'),
        Date.now(),
        false,
      );

      expect(result.planFeatureRefusal).toEqual({ feature: 'allowImageGeneration' });
      expect(result.imageGenerationId).toBeUndefined();
    });

    it('surfaces an entitlements outage as the outage, not as the plan (fails closed)', async () => {
      accessControl.hasPlanFeatureFor.mockRejectedValue(new Error('ENTITLEMENTS_UNAVAILABLE'));

      await expect(
        manager.callProvider(
          'IMAGE_OPENAI',
          'gpt-image-1',
          makeContext('generate an image of a lighthouse'),
          Date.now(),
          false,
        ),
      ).rejects.toThrow('ENTITLEMENTS_UNAVAILABLE');
      expect(httpRequest).not.toHaveBeenCalled();
    });

    it('leaves an ordinary chat turn on a free plan alone', async () => {
      accessControl.hasPlanFeatureFor.mockResolvedValue(false);
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
        makeContext('explain photosynthesis'),
        Date.now(),
        false,
      );

      expect(result.content).toBe('local response');
      expect(result.planFeatureRefusal).toBeUndefined();
      expect(accessControl.hasPlanFeatureFor).not.toHaveBeenCalledWith(
        expect.any(String),
        'allowImageGeneration',
      );
    });
  });

  it('consumes one AI-file allowance once the file is queued', async () => {
    vi.spyOn(FileWriterCandidatesClient.prototype, 'resolve').mockResolvedValue([]);
    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        data: {
          model: 'qwen3:7b',
          response: '# Brief',
          done: true,
          promptEvalCount: 1,
          evalCount: 1,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        data: { generationId: 'file-gen-2', status: 'QUEUED', format: 'PDF' },
      });

    await manager.callProvider(
      'FILE_GENERATION',
      'auto',
      makeContext('Generate a PDF brief'),
      Date.now(),
      false,
    );

    expect(accessControl.reserveFeature).toHaveBeenCalledWith(
      expect.any(String),
      'FILE_GENERATION',
      expect.any(String),
    );
    expect(accessControl.settleFeature).toHaveBeenCalledWith('feature-res-1', 'CONSUME');
  });

  it('gives the allowance back when the file cannot be written', async () => {
    vi.spyOn(FileWriterCandidatesClient.prototype, 'resolve').mockResolvedValue([]);
    httpRequest.mockResolvedValue({ ok: false, status: 500, data: {} });

    await manager
      .callProvider(
        'FILE_GENERATION',
        'auto',
        makeContext('Generate a PDF brief'),
        Date.now(),
        false,
      )
      .catch(() => {});

    expect(accessControl.settleFeature).toHaveBeenCalledWith('feature-res-1', 'RELEASE');
    expect(accessControl.settleFeature).not.toHaveBeenCalledWith('feature-res-1', 'CONSUME');
  });

  it('refuses without calling any model once the allowance is used', async () => {
    accessControl.reserveFeature.mockResolvedValueOnce({
      allowed: false,
      reason: 'FEATURE_TRIAL_EXHAUSTED',
      used: 15,
      limit: 15,
      window: 'DAY',
    });

    const result = await manager.callProvider(
      'FILE_GENERATION',
      'auto',
      makeContext('Generate a PDF brief'),
      Date.now(),
      false,
    );

    expect(httpRequest).not.toHaveBeenCalled();
    expect(result.fileLimit).toEqual({ used: 15, limit: 15, window: 'DAY' });
    expect(result.fileGenerationId).toBeUndefined();
    expect(result.content).toContain('15 of 15');
  });

  it('falls back to the next file content provider when the first local model fails', async () => {
    vi.spyOn(FileWriterCandidatesClient.prototype, 'resolve').mockResolvedValue([]);
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

    const retryOllamaBodyCall = httpRequest.mock.calls[1];
    expect(retryOllamaBodyCall).toBeDefined();
    const retryOllamaBody = retryOllamaBodyCall?.[0].body as {
      model: string;
      options: { num_predict: number };
    };
    expect(retryOllamaBody.model).toBe('llama3.3:8b');
    expect(retryOllamaBody.options.num_predict).toBe(HARD_MAX_OUTPUT_TOKENS);

    const fileGenerationBodyCall = httpRequest.mock.calls[2];
    expect(fileGenerationBodyCall).toBeDefined();
    const fileGenerationBody = fileGenerationBodyCall?.[0].body as {
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

    judgeManager.shouldActivate = vi.fn().mockReturnValue(true);
    judgeManager.evaluate = vi.fn().mockResolvedValue({
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
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
        timestamp: new Date().toISOString(),
      },
      context,
    );

    expect(qualityManager.checkResponseQuality).toHaveBeenCalledTimes(1);
    expect(judgeManager.shouldActivate).toHaveBeenCalledTimes(1);
    expect(judgeManager.evaluate).toHaveBeenCalledWith(
      expect.anything(),
      context,
      expect.objectContaining({
        enabled: true,
        criticEnabled: true,
        criticModel: 'ANTHROPIC:claude-sonnet-4',
      }),
      expect.anything(),
      undefined,
    );
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

    judgeManager.shouldActivate = vi.fn().mockReturnValue(true);
    judgeManager.evaluate = vi.fn().mockResolvedValue({
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

      const urlCall = httpRequest.mock.calls[0];
      expect(urlCall).toBeDefined();
      const url = urlCall?.[0].url as string;
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
      const urlCall = httpRequest.mock.calls[0];
      expect(urlCall).toBeDefined();
      const url = urlCall?.[0].url as string;
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

  describe('Ollama Cloud quota safety', () => {
    it('does not expose provider-native web tools during model generation', async () => {
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
      const firstChatBodyCall = httpRequest.mock.calls[1];
      expect(firstChatBodyCall).toBeDefined();
      const firstChatBody = firstChatBodyCall?.[0].body as {
        tools?: Array<{ type: string; function: { name: string } }>;
      };
      expect(firstChatBody.tools).toBeUndefined();
    });

    it('runs a single explicitly requested tool turn and re-POSTs with the tool result', async () => {
      const context = makeContext('what is the latest react version?');
      httpRequest
        // 1: first /api/chat — model emits a tool_call
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

      const startTime = Date.now();
      const result = await manager.runOllamaCloudToolLoop({
        provider: 'OLLAMA',
        model: 'deepseek-v4-pro',
        initialBody: {
          model: 'deepseek-v4-pro',
          messages: [{ role: 'user', content: 'what is the latest react version?' }],
          stream: false,
        },
        baseUrl: 'https://ollama.com/api',
        apiKey: 'k',
        startTime,
        usedFallback: false,
        context,
      });

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
      const toolUrlCall = httpRequest.mock.calls[1];
      expect(toolUrlCall).toBeDefined();
      const toolUrl = toolUrlCall?.[0].url as string;
      expect(toolUrl).toBe('https://ollama.com/api/web_search');
      expect(accessControl.recordFeatureUsage).toHaveBeenCalledWith(
        'user-1',
        'WEB_SEARCH',
        `buffered:${String(startTime)}:1:tool-1`,
      );

      // The follow-up chat carries the tool result as a `tool` message.
      const secondChatBodyCall = httpRequest.mock.calls[2];
      expect(secondChatBodyCall).toBeDefined();
      const secondChatBody = secondChatBodyCall?.[0].body as {
        messages: Array<{ role: string; content: string; tool_call_id?: string }>;
      };
      const toolMessage = secondChatBody.messages.find((m) => m.role === 'tool');
      expect(toolMessage).toBeDefined();
      expect(toolMessage?.content).toContain('React 19');
      expect(toolMessage?.tool_call_id).toBe('tool-1');
    });

    it('caps and wraps up an explicitly requested tool loop', async () => {
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

      const result = await manager.runOllamaCloudToolLoop({
        provider: 'OLLAMA',
        model: 'deepseek-v4-pro',
        initialBody: {
          model: 'deepseek-v4-pro',
          messages: [{ role: 'user', content: 'infinite-loop scenario' }],
          stream: false,
        },
        baseUrl: 'https://ollama.com/api',
        apiKey: 'k',
        startTime: Date.now(),
        usedFallback: false,
        context,
      });

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
      // 10 (chat) + 10 (web_search) + 1 (wrap-up) = 21 calls
      expect(httpRequest).toHaveBeenCalledTimes(21);
    });
  });

  // Batch 2 (connector presets, ADR-116/117): every preset in
  // CONNECTOR_PRESETS dispatches through the same generic OpenAI-compatible
  // cloud path as OPENAI/DEEPSEEK/GROK — resolveProviderConfig() resolves the
  // base URL, callProvider() builds `${baseUrl}/chat/completions` with a
  // `Bearer` auth header. OpenRouter stands in for the other fourteen: it
  // shares the exact same generic dispatch code, so one representative
  // preset proves the wiring for all of them (the constants-wiring spec
  // proves every preset key/URL is registered).
  describe('connector-preset provider dispatch (OpenRouter, representative)', () => {
    it('resolves OpenRouter base URL, sends Bearer auth, and returns the streamed-off completion', async () => {
      const context = makeContext('summarize the incident');

      httpRequest
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            provider: 'OPENROUTER',
            apiKey: 'or-test-key',
            baseUrl: 'https://openrouter.ai/api/v1',
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          data: {
            id: 'gen-1',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Incident summary.' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 14, completion_tokens: 6, total_tokens: 20 },
          },
        });

      const result = await manager.callProvider(
        'OPENROUTER',
        'openrouter/some-model',
        context,
        Date.now(),
        false,
        undefined,
        'AUTO',
      );

      expect(result.content).toBe('Incident summary.');

      const completionCall = httpRequest.mock.calls[1]?.[0] as {
        url: string;
        headers: Record<string, string>;
        body: { messages: Array<{ role: string; content: string }> };
      };
      expect(completionCall.url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(completionCall.headers.Authorization).toBe('Bearer or-test-key');
      expect(completionCall.body.messages.length).toBeGreaterThan(0);
    });
  });

  // Bug: a manual single-model selection has no fallback chain, so "Every
  // available AI provider failed to respond (tried X)" reads oddly for one
  // model — and a Groq-shaped `{"error":{"message":...}}` body was being
  // treated as an unsafe provider payload and swallowed into that generic
  // text, even though its `message` field is a plain, already-safe sentence.
  describe('failure wording for an exhausted chain', () => {
    type ManagerWithChainFailure = {
      buildChainFailureError(lastError: unknown, attempts: AttemptRecord[]): unknown;
    };
    const asManagerWithChainFailure = (): ManagerWithChainFailure =>
      manager as unknown as ManagerWithChainFailure;

    const attemptRecord = (provider: string, model: string, attemptIndex = 0): AttemptRecord => ({
      attemptIndex,
      provider,
      model,
      startedAt: new Date().toISOString(),
      durationMs: 12,
      status: 'FAILURE',
    });
    const attemptFor = (provider: string, model: string): AttemptRecord[] => [
      attemptRecord(provider, model),
    ];

    it('names the single model and surfaces a safe Groq decommissioned-model message', () => {
      const groqBody =
        '{"error":{"message":"The model `qwen/qwen3.8-27b` has been decommissioned and is no longer supported.","type":"invalid_request_error","code":"model_decommissioned"}}';
      const lastError = new Error(groqBody);

      const result = asManagerWithChainFailure().buildChainFailureError(
        lastError,
        attemptFor('GROQ', 'qwen/qwen3.8-27b'),
      );

      expect(result).toBeInstanceOf(BusinessException);
      expect((result as InstanceType<typeof BusinessException>).message).toBe(
        'GROQ/qwen/qwen3.8-27b failed to respond: The model `qwen/qwen3.8-27b` has been decommissioned and is no longer supported.',
      );
    });

    it('falls back to a plain single-model message when there is nothing safe to extract', () => {
      const lastError = new Error('{"error":{"code":500}}');

      const result = asManagerWithChainFailure().buildChainFailureError(
        lastError,
        attemptFor('GROQ', 'allam-2-7b'),
      );

      expect((result as InstanceType<typeof BusinessException>).message).toBe(
        'GROQ/allam-2-7b failed to respond. Please try again shortly.',
      );
    });

    it('never leaks a URL, even from an otherwise-safe-looking message', () => {
      const lastError = new Error(
        '{"error":{"code":429,"message":"go to https://ai.studio/projects to pay"}}',
      );

      const result = asManagerWithChainFailure().buildChainFailureError(
        lastError,
        attemptFor('GEMINI', 'gemini-2.5-pro'),
      );

      const message = (result as InstanceType<typeof BusinessException>).message;
      expect(message).not.toContain('ai.studio');
      expect(message).toBe('GEMINI/gemini-2.5-pro failed to respond. Please try again shortly.');
    });

    it('keeps the multi-provider chain wording unchanged', () => {
      const lastError = new Error('{"error":{"message":"decommissioned"}}');
      const attempts = [attemptRecord('GROQ', 'model-a'), attemptRecord('CEREBRAS', 'model-b', 1)];

      const result = asManagerWithChainFailure().buildChainFailureError(lastError, attempts);

      expect((result as InstanceType<typeof BusinessException>).message).toBe(
        'Every available AI provider failed to respond (tried GROQ/model-a, CEREBRAS/model-b). Please try again shortly.',
      );
    });

    it('preserves a non-provider-payload error untouched', () => {
      const lastError = new Error('request failed with status 401');

      const result = asManagerWithChainFailure().buildChainFailureError(
        lastError,
        attemptFor('GROQ', 'openai/gpt-oss-120b'),
      );

      expect(result).toBe(lastError);
    });
  });
});
