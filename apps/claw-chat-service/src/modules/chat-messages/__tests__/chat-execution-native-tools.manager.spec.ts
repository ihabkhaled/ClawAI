// Native tool transport at the ChatExecutionManager boundary.
//
// The translator has its own exhaustive suite; this file covers only what the
// manager is responsible for: that a tool catalog actually reaches the wire in
// the right dialect, that tool calls come back parsed, and that the two
// failure modes which silently broke this lane can no longer recur —
//   D7  the `tools` field promised by a comment but never assigned, and
//   the Ollama empty-content throw that terminated every native tool call.

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AccessControlService } from '../services/access-control.service';
import type { AssembledContext } from '../types/context.types';
import type { ExecutionOptions } from '../types/execution-options.types';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { OllamaChatRequest, OpenAiChatRequest } from '../types/execution.types';
import { ToolChoiceMode } from '../../../common/enums';
import { ClawEffortProfile } from '@claw/shared-types';

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

const DEFAULT_APP_CONFIG = {
  OLLAMA_SERVICE_URL: 'http://ollama:4008',
  OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
  CONNECTOR_SERVICE_URL: 'http://connector:4011',
  FILE_GENERATION_SERVICE_URL: 'http://file-generation:4013',
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 50,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
  CHAT_NATIVE_TOOL_CALLING_ENABLED: true,
  CHAT_TOOL_CATALOG_MAX_BYTES: 262_144,
};

const FILES_DEFINITION: ToolDefinitionDto = {
  schemaVersion: '2.0',
  name: 'workspace.files',
  version: '2.0.0',
  description: 'Bounded workspace discovery, reads, and transactional file mutation.',
  operations: ['read', 'list', 'create'],
  riskClasses: ['inspect', 'workspace-write'],
  targetIds: ['target:workspace'],
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', maxLength: 1_048_576 } },
    required: [],
    additionalProperties: false,
  },
} as ToolDefinitionDto;

const makeContext = (content: string): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'msg-1', threadId: 'thread-1', role: 'USER', content }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

const withTools = (overrides: Partial<ExecutionOptions> = {}): ExecutionOptions => ({
  fastPathEnabled: false,
  applyShortResponseConstraint: false,
  toolCatalog: [FILES_DEFINITION],
  ...overrides,
});

const withoutTools = (): ExecutionOptions => ({
  fastPathEnabled: false,
  applyShortResponseConstraint: false,
});

// Minimal manager for tests that only exercise request-body construction and
// never reach a provider.
const buildManager = (): ChatExecutionManager =>
  new ChatExecutionManager(
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
      buildMetadata: jest.fn().mockReturnValue({}),
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
      run: jest.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
        context: ctx,
        outcome: { applied: false, results: [], runId: null, warning: null },
      })),
    } as any,
    {
      recordUsage: jest.fn(),
      recordFeatureUsage: jest.fn(async () => {}),
    } as unknown as AccessControlService,
    { uploadFile: jest.fn(), getCachedOrUpload: jest.fn() } as any,
    {
      resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
      resolveModelList: jest.fn().mockResolvedValue(['qwen3:7b']),
    } as unknown as LocalModelSelectionService,
  );

describe('ChatExecutionManager — native tool transport', () => {
  let manager: ChatExecutionManager;
  let accessControl: { recordUsage: jest.Mock; recordFeatureUsage: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks resets call records but NOT the mockResolvedValueOnce
    // queue. Tests that reject early (the byte-budget case) leave an unconsumed
    // response behind, which would then answer the next test's first request.
    // mockReset drains the queue so each test starts from a known empty state.
    httpRequest.mockReset();
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);

    const contextAssembly = {
      buildPromptString: jest.fn().mockReturnValue('user prompt'),
      buildChatMessages: jest.fn().mockReturnValue([{ role: 'user', content: 'Read main.ts' }]),
      buildGeminiChatMessages: jest
        .fn()
        .mockReturnValue([{ role: 'user', content: 'Read main.ts' }]),
    };
    accessControl = { recordUsage: jest.fn(), recordFeatureUsage: jest.fn(async () => {}) };

    manager = new ChatExecutionManager(
      contextAssembly as unknown as ContextAssemblyManager,
      {
        checkResponseQuality: jest.fn().mockReturnValue({ score: 0.9, reasons: [] }),
        shouldReRoute: jest.fn().mockReturnValue({ shouldReRoute: false }),
      } as unknown as QualityCheckManager,
      {
        setExecutionManager: jest.fn(),
        shouldActivate: jest.fn().mockReturnValue(false),
        evaluate: jest.fn(),
        buildMetadata: jest.fn().mockReturnValue({ judgeEnabled: true }),
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
        run: jest.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
          context: ctx,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as any,
      accessControl as unknown as AccessControlService,
      { uploadFile: jest.fn(), getCachedOrUpload: jest.fn() } as any,
      {
        resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        resolveModelList: jest.fn().mockResolvedValue(['qwen3:7b']),
      } as unknown as LocalModelSelectionService,
    );
  });

  function mockOpenAi(message: Record<string, unknown>, finishReason = 'stop'): void {
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
          choices: [{ index: 0, message, finish_reason: finishReason }],
          usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
        },
      });
  }

  function mockOllama(message: Record<string, unknown>): void {
    httpRequest
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { provider: 'OLLAMA', apiKey: 'ollama-key', baseUrl: 'https://ollama.com/api' },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'qwen3-coder:480b-cloud',
          message,
          done: true,
          done_reason: 'stop',
          prompt_eval_count: 10,
          eval_count: 4,
        },
      });
  }

  const requestBodyOf = <T>(callIndex = 1): T => httpRequest.mock.calls[callIndex][0].body as T;

  describe('request side', () => {
    it('attaches the translated catalog and tool_choice to an OpenAI-compatible body', async () => {
      mockOpenAi({ role: 'assistant', content: 'done' });

      await manager.callProvider(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      const body = requestBodyOf<OpenAiChatRequest>();
      expect(body.tools).toHaveLength(1);
      expect(body.tools?.[0]?.function.name).toBe('workspace_files');
      expect(body.tool_choice).toBe('auto');
    });

    it('sends tool_choice: required when the caller asks for it', async () => {
      mockOpenAi({ role: 'assistant', content: 'done' });

      await manager.callProvider(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools({ toolChoice: ToolChoiceMode.REQUIRED }),
      );

      expect(requestBodyOf<OpenAiChatRequest>().tool_choice).toBe('required');
    });

    it('sends NO tools when the call carries no catalog — ordinary chat is untouched', async () => {
      mockOpenAi({ role: 'assistant', content: 'done' });

      await manager.callProvider(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('hello'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withoutTools(),
      );

      const body = requestBodyOf<OpenAiChatRequest>();
      expect(body.tools).toBeUndefined();
      expect(body.tool_choice).toBeUndefined();
    });

    it('sends NO tools when native tool calling is disabled by config', async () => {
      AppConfig.get.mockReturnValue({
        ...DEFAULT_APP_CONFIG,
        CHAT_NATIVE_TOOL_CALLING_ENABLED: false,
      });
      mockOpenAi({ role: 'assistant', content: 'done' });

      await manager.callProvider(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      expect(requestBodyOf<OpenAiChatRequest>().tools).toBeUndefined();
    });

    // D7 regression. buildOllamaChatRequestBody carried a comment promising
    // "we pass them unconditionally" above a bare `return requestBody`. No
    // model on this lane had ever been offered a tool.
    it('actually assigns tools on the native Ollama body (D7 regression)', async () => {
      mockOllama({ role: 'assistant', content: 'done' });

      await manager.callProvider(
        'OLLAMA',
        'qwen3-coder:480b-cloud',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      const body = requestBodyOf<OllamaChatRequest>();
      expect(body.tools).toHaveLength(1);
      expect(body.tools?.[0]?.function.name).toBe('workspace_files');
    });

    it('omits tool_choice on native Ollama, which cannot express a forced call', async () => {
      mockOllama({ role: 'assistant', content: 'done' });

      await manager.callProvider(
        'OLLAMA',
        'qwen3-coder:480b-cloud',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools({ toolChoice: ToolChoiceMode.REQUIRED }),
      );

      expect(requestBodyOf<OllamaChatRequest>()).not.toHaveProperty('tool_choice');
    });

    it('rejects a catalog larger than the configured byte budget', async () => {
      AppConfig.get.mockReturnValue({ ...DEFAULT_APP_CONFIG, CHAT_TOOL_CATALOG_MAX_BYTES: 10 });
      mockOpenAi({ role: 'assistant', content: 'done' });

      await expect(
        manager.callProvider(
          'OPENAI',
          'gpt-4o-mini',
          makeContext('read main.ts'),
          Date.now(),
          false,
          undefined,
          'AUTO',
          withTools(),
        ),
      ).rejects.toThrow(/byte budget/u);
    });
  });

  describe('response side', () => {
    it('parses OpenAI tool_calls back to Runtime tool identity', async () => {
      mockOpenAi(
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'workspace_files',
                arguments: JSON.stringify({
                  operation: 'read',
                  targetId: 'target:workspace',
                  arguments: { path: 'src/main.ts' },
                }),
              },
            },
          ],
        },
        'tool_calls',
      );

      const result = await manager.callProvider(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]).toMatchObject({
        toolName: 'workspace.files',
        toolVersion: '2.0.0',
        operation: 'read',
        targetId: 'target:workspace',
        arguments: { path: 'src/main.ts' },
      });
      expect(result.finishedForTools).toBe(true);
    });

    // The bug that made native tools unusable on the lane that was actually
    // failing in production: a tool-call turn has EMPTY content by design, and
    // the emptiness guard threw CLOUD_PROVIDER_EMPTY_RESPONSE before anything
    // could read message.tool_calls. Observed live as
    // "Cloud provider OLLAMA returned no message content".
    it('does NOT throw on an Ollama tool-call turn with empty content', async () => {
      mockOllama({
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            function: {
              name: 'workspace_files',
              arguments: {
                operation: 'read',
                targetId: 'target:workspace',
                arguments: { path: 'src/main.ts' },
              },
            },
          },
        ],
      });

      const result = await manager.callProvider(
        'OLLAMA',
        'qwen3-coder:480b-cloud',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]?.operation).toBe('read');
      // Ollama omits the call id; one is synthesized so the result message can
      // be correlated on the next turn.
      expect(result.toolCalls?.[0]?.callId).toBe('call_0');
      expect(result.finishedForTools).toBe(true);
    });

    it('still throws when Ollama returns neither content nor tool calls', async () => {
      mockOllama({ role: 'assistant', content: '' });

      await expect(
        manager.callProvider(
          'OLLAMA',
          'qwen3-coder:480b-cloud',
          makeContext('read main.ts'),
          Date.now(),
          false,
          undefined,
          'AUTO',
          withTools(),
        ),
      ).rejects.toThrow(/no message content/u);
    });

    it('leaves toolCalls undefined on an ordinary final answer', async () => {
      mockOpenAi({ role: 'assistant', content: 'Here is the answer.' });

      const result = await manager.callProvider(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      expect(result.toolCalls).toBeUndefined();
      expect(result.content).toBe('Here is the answer.');
    });
  });

  describe('local Ollama lane', () => {
    // `/api/generate` is prompt-completion: no message array, no roles, nothing
    // to attach tools to. A local agent run therefore has to switch surfaces
    // entirely, not just add a field.
    it('routes to /ollama/chat instead of /ollama/generate when tools are present', async () => {
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          model: 'qwen3-coder:30b',
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                function: {
                  name: 'workspace_files',
                  arguments: {
                    operation: 'read',
                    targetId: 'target:workspace',
                    arguments: { path: 'src/main.ts' },
                  },
                },
              },
            ],
          },
          done: true,
          prompt_eval_count: 10,
          eval_count: 4,
        },
      });

      const result = await manager.callProvider(
        'local-ollama',
        'qwen3-coder:30b',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      expect(httpRequest.mock.calls[0][0].url).toContain('/api/v1/ollama/chat');
      expect(httpRequest.mock.calls[0][0].url).not.toContain('/generate');
      const body = httpRequest.mock.calls[0][0].body as OllamaChatRequest;
      expect(body.tools).toHaveLength(1);
      expect(body.messages).toBeDefined();
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls?.[0]?.toolName).toBe('workspace.files');
    });

    it('still uses /ollama/generate when no tool catalog is attached', async () => {
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { model: 'qwen3:8b', response: 'Hello.', done: true },
      });

      await manager.callProvider(
        'local-ollama',
        'qwen3:8b',
        makeContext('hi'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withoutTools(),
      );

      expect(httpRequest.mock.calls[0][0].url).toContain('/api/v1/ollama/generate');
    });
  });

  describe('streaming', () => {
    // Tools used to be stripped from every streaming request because the
    // reader had no tool_call delta handling. It does now, so they ride along.
    it('keeps native tools on a streaming OpenAI request', async () => {
      httpRequest.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { provider: 'OPENAI', apiKey: 'test-key', baseUrl: 'https://api.openai.com/v1' },
      });

      const body = (
        manager as unknown as {
          buildStreamingChatBody: (
            provider: string,
            model: string,
            context: AssembledContext,
            threadSettings: undefined,
            executionOptions: ExecutionOptions,
          ) => OpenAiChatRequest;
        }
      ).buildStreamingChatBody(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('read main.ts'),
        undefined,
        withTools(),
      );

      expect(body.stream).toBe(true);
      expect(body.tools).toHaveLength(1);
      expect(body.tools?.[0]?.function.name).toBe('workspace_files');
    });

    it('omits tools from a streaming request that carries no catalog', () => {
      const body = (
        manager as unknown as {
          buildStreamingChatBody: (
            provider: string,
            model: string,
            context: AssembledContext,
            threadSettings: undefined,
            executionOptions: ExecutionOptions,
          ) => OpenAiChatRequest;
        }
      ).buildStreamingChatBody(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('hi'),
        undefined,
        withoutTools(),
      );

      expect(body.tools).toBeUndefined();
    });
  });

  describe('token chokepoint', () => {
    // Every tool turn is an ordinary callProvider call, so deduction must fire
    // exactly once per turn — not zero times (free tools) and not twice.
    it('records usage exactly once for a tool-call turn', async () => {
      mockOpenAi(
        {
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'workspace_files',
                arguments: JSON.stringify({
                  operation: 'read',
                  targetId: 'target:workspace',
                  arguments: {},
                }),
              },
            },
          ],
        },
        'tool_calls',
      );

      await manager.callProvider(
        'OPENAI',
        'gpt-4o-mini',
        makeContext('read main.ts'),
        Date.now(),
        false,
        undefined,
        'AUTO',
        withTools(),
      );

      expect(accessControl.recordUsage).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ChatExecutionManager — reasoning effort', () => {
  let manager: ChatExecutionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    httpRequest.mockReset();
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);
    manager = buildManager();
  });

  const buildOpenAi = (options: ExecutionOptions): OpenAiChatRequest =>
    (
      manager as unknown as {
        buildChatRequestBody: (
          provider: string,
          model: string,
          context: AssembledContext,
          threadSettings: undefined,
          executionOptions: ExecutionOptions,
        ) => OpenAiChatRequest;
      }
    ).buildChatRequestBody('OPENAI', 'gpt-4o', makeContext('hi'), undefined, options);

  const base = (): ExecutionOptions => ({
    fastPathEnabled: false,
    applyShortResponseConstraint: false,
  });

  it('adds no effort field at all when none was requested', () => {
    // Every pre-existing path must be byte-identical to before this feature.
    expect(buildOpenAi(base()).reasoning).toBeUndefined();
  });

  it('sends the exact level when the model proves it accepts it', () => {
    const body = buildOpenAi({
      ...base(),
      effortProfile: ClawEffortProfile.HIGH,
      effortSupportedValues: ['low', 'medium', 'high'],
    });

    expect(body.reasoning).toEqual({ effort: 'high' });
  });

  it('sends the highest accepted level when the requested one is unsupported', () => {
    const body = buildOpenAi({
      ...base(),
      effortProfile: ClawEffortProfile.MAX,
      effortSupportedValues: ['low', 'medium'],
    });

    // Downgraded rather than refused — but never silently: the manager logs a
    // WARN, which is the user-visible half of the guarantee.
    expect(body.reasoning).toEqual({ effort: 'medium' });
  });

  it('sends NOTHING when the capability registry has no proven values', () => {
    // Guessing a level here would be the "hard-coded model-name guess" the
    // pack forbids. The effort is supplied by ClawAI orchestration instead.
    const body = buildOpenAi({
      ...base(),
      effortProfile: ClawEffortProfile.HIGH,
      effortSupportedValues: [],
    });

    expect(body.reasoning).toBeUndefined();
  });

  it('never puts the literal string "ultra" on the wire', () => {
    const body = buildOpenAi({
      ...base(),
      effortProfile: ClawEffortProfile.ULTRA,
      effortSupportedValues: ['low', 'medium', 'high', 'xhigh', 'max'],
    });

    expect(body.reasoning?.effort).toBe('max');
    expect(body.reasoning?.effort).not.toBe('ultra');
  });
});
