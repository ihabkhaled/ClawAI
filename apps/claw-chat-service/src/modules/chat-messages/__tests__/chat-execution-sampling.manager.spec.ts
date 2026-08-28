// Sampling parameters at the ChatExecutionManager boundary.
//
// Claude Fable 5, Opus 5, Opus 4.8/4.7 and Sonnet 5 removed sampling: sending
// `temperature` to one is HTTP 400, not a warning. A thread with a temperature
// set therefore failed EVERY turn on those models, and the user saw "every
// available AI provider failed to respond" rather than the real reason.
//
// The paired assertions matter as much as the fix: dropping temperature for a
// model that still honours it would silently change tuned answers.

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AccessControlService } from '../services/access-control.service';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { AssembledContext } from '../types/context.types';
import type { OpenAiChatRequest, ThreadSettings } from '../types/execution.types';

jest.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: jest.fn().mockImplementation(() => ({
    isExposed: jest.fn().mockResolvedValue(true),
  })),
}));
jest.mock('../../../common/utilities', () => ({
  httpRequest: jest.fn(),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined => {
    if (!record) return undefined;
    return Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined;
  },
}));
jest.mock('../../../app/config/app.config');

const { httpRequest } = jest.requireMock('../../../common/utilities') as { httpRequest: jest.Mock };
const { AppConfig } = jest.requireMock('../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};

const makeContext = (userMessage: string): AssembledContext =>
  ({
    systemPrompt: 'You are a test assistant.',
    messages: [{ role: 'user', content: userMessage }],
    contextChunks: [],
    memoryEntries: [],
    attachments: [],
  }) as unknown as AssembledContext;

describe('ChatExecutionManager sampling parameters', () => {
  let manager: ChatExecutionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    AppConfig.get.mockReturnValue({
      OLLAMA_SERVICE_URL: 'http://ollama:4008',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      FILE_GENERATION_SERVICE_URL: 'http://file-generation:4013',
      OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 50,
      OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
      CHAT_NATIVE_TOOL_CALLING_ENABLED: false,
      CHAT_TOOL_CATALOG_MAX_BYTES: 262_144,
    });

    manager = new ChatExecutionManager(
      {
        buildPromptString: jest.fn().mockReturnValue('user prompt'),
        buildChatMessages: jest.fn().mockReturnValue([{ role: 'user', content: 'hi' }]),
        buildGeminiChatMessages: jest.fn().mockReturnValue([{ role: 'user', content: 'hi' }]),
      } as unknown as ContextAssemblyManager,
      {
        checkResponseQuality: jest.fn().mockReturnValue({ score: 0.9, reasons: [] }),
        shouldReRoute: jest.fn().mockReturnValue({ shouldReRoute: false }),
      } as unknown as QualityCheckManager,
      {
        setExecutionManager: jest.fn(),
        shouldActivate: jest.fn().mockReturnValue(false),
        evaluate: jest.fn(),
        buildMetadata: jest.fn().mockReturnValue({ judgeEnabled: false }),
      } as unknown as JudgeRefereeManager,
      {
        emitRouterStarted: jest.fn(),
        emitProviderSelected: jest.fn(),
        emitResponseStreaming: jest.fn(),
        startResponseProgressHeartbeat: jest.fn().mockReturnValue(jest.fn()),
        emitFallbackAttempt: jest.fn(),
        emitError: jest.fn(),
      } as unknown as ChatStreamService,
      {
        run: jest.fn().mockImplementation(async (_query: string, ctx: unknown) => ({
          context: ctx,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as unknown as SearchFirstManager,
      {
        recordUsage: jest.fn(),
        recordFeatureUsage: jest.fn(async () => {}),
      } as unknown as AccessControlService,
      {
        uploadFile: jest.fn(),
        getCachedOrUpload: jest.fn(),
      } as unknown as GeminiFilesApiManager,
      {
        resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        resolveModelList: jest.fn().mockResolvedValue(['qwen3:7b']),
      } as unknown as LocalModelSelectionService,
    );
  });

  function mockAnthropicCompat(): void {
    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          provider: 'ANTHROPIC',
          apiKey: 'sk-ant-test',
          baseUrl: 'https://api.anthropic.com/v1',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          id: 'chatcmpl-1',
          choices: [
            { index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
        },
      });
  }

  const requestBodyOf = <T>(callIndex = 1): T => httpRequest.mock.calls[callIndex][0].body as T;

  const settings = { temperature: 0.7 } as unknown as ThreadSettings;

  it.each(['claude-fable-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-sonnet-5'])(
    'omits temperature for %s, which would reject the whole request',
    async (model) => {
      mockAnthropicCompat();

      await manager.callProvider(
        'ANTHROPIC',
        model,
        makeContext('hi'),
        Date.now(),
        false,
        settings,
      );

      expect(requestBodyOf<OpenAiChatRequest>().temperature).toBeUndefined();
    },
  );

  it.each(['claude-opus-4-6', 'claude-opus-4-5-20251101'])(
    'still sends temperature for %s, which honours it',
    async (model) => {
      mockAnthropicCompat();

      await manager.callProvider(
        'ANTHROPIC',
        model,
        makeContext('hi'),
        Date.now(),
        false,
        settings,
      );

      expect(requestBodyOf<OpenAiChatRequest>().temperature).toBe(0.7);
    },
  );
});
