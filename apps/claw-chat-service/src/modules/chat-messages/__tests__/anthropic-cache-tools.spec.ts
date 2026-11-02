import { type Mock, vi } from 'vitest';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { PromptCachePolicyService } from '../services/prompt-cache-policy.service';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { AssembledContext } from '../types/context.types';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

/**
 * F093 for an agent turn: a tool-carrying call on a model an administrator
 * switched caching on for.
 *
 *  - the tools ride the native Messages body, inside the cached prefix;
 *  - the hold is sized for them, since they are prompt and the first thing
 *    written to the cache;
 *  - a `tool_use` block in the reply comes back as a Runtime tool call;
 *  - a catalog the native body cannot carry keeps the call uncached.
 */

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
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
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const APP_CONFIG = {
  OLLAMA_SERVICE_URL: 'http://ollama:4008',
  OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
  CONNECTOR_SERVICE_URL: 'http://connector:4011',
  FILE_GENERATION_SERVICE_URL: 'http://file-generation:4013',
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 50,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
  AUTH_SERVICE_URL: 'http://auth:4001',
  ENABLE_GEMINI_FILES_API: false,
  ENABLE_ANTHROPIC_NATIVE_PDF: false,
  CHAT_NATIVE_TOOL_CALLING_ENABLED: true,
  CHAT_TOOL_CATALOG_MAX_BYTES: 262_144,
};

const makeContext = (): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'm1', threadId: 'thread-1', role: 'USER', content: 'hello' }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

const filesTool = {
  schemaVersion: '2.0',
  name: 'workspace.files',
  version: '2.0.0',
  description: 'Bounded workspace discovery and reads.',
  operations: ['read', 'list'],
  riskClasses: ['inspect'],
  targetIds: ['target:workspace'],
  inputSchema: {
    type: 'object',
    properties: { path: { type: 'string', maxLength: 4096 } },
    required: [],
    additionalProperties: false,
    maxProperties: 8,
  },
} as unknown as ToolDefinitionDto;

const toolUseReply = (): unknown => ({
  ok: true,
  status: 200,
  data: {
    id: 'msg_1',
    content: [
      { type: 'text', text: 'Reading it.' },
      {
        type: 'tool_use',
        id: 'toolu_1',
        name: 'workspace_files',
        input: {
          operation: 'read',
          targetId: 'target:workspace',
          arguments: { path: 'a.ts' },
        },
      },
    ],
    stop_reason: 'tool_use',
    usage: {
      input_tokens: 12,
      cache_creation_input_tokens: 3000,
      cache_read_input_tokens: 0,
      output_tokens: 60,
    },
  },
});

describe('Anthropic prompt caching on a tool-carrying call (F093)', () => {
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;
  let shouldCache: Mock;

  const build = (): ChatExecutionManager => {
    shouldCache = vi.fn().mockResolvedValue(true);
    return new ChatExecutionManager(
      {
        buildPromptString: vi.fn().mockReturnValue('a prompt of some length'),
        buildChatMessages: vi.fn().mockReturnValue([
          { role: 'system', content: 'You are ClawAI.' },
          { role: 'user', content: 'hi' },
        ]),
        buildGeminiChatMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'hi' }]),
      } as unknown as ContextAssemblyManager,
      {
        checkResponseQuality: vi.fn().mockReturnValue({ score: 0.9, reasons: [] }),
        shouldReRoute: vi.fn().mockReturnValue({ shouldReRoute: false }),
      } as unknown as QualityCheckManager,
      {
        setExecutionManager: vi.fn(),
        shouldActivate: vi.fn().mockReturnValue(false),
      } as unknown as JudgeRefereeManager,
      {
        emitRouterStarted: vi.fn(),
        emitProviderSelected: vi.fn(),
        emitResponseStreaming: vi.fn(),
        startResponseProgressHeartbeat: vi.fn().mockReturnValue(vi.fn()),
        emitFallbackAttempt: vi.fn(),
        emitError: vi.fn(),
        emitProgressStage: vi.fn(),
      } as unknown as ChatStreamService,
      {
        run: vi.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
          context: ctx,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as unknown as SearchFirstManager,
      accessControl as unknown as AccessControlService,
      { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as unknown as GeminiFilesApiManager,
      {
        resolveDefaultModel: vi.fn().mockResolvedValue('qwen3:1.7b'),
        resolveModelList: vi.fn().mockResolvedValue(['qwen3:7b']),
      } as unknown as LocalModelSelectionService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { shouldCache } as unknown as PromptCachePolicyService,
    );
  };

  type SentRequest = { url: string; body: Record<string, unknown> };

  function providerCall(): SentRequest {
    const call = httpRequest.mock.calls.find(
      (entry) => !(entry[0].url as string).includes('/internal/connectors/config'),
    );
    return call?.[0] as SentRequest;
  }

  function stubProvider(response: unknown): void {
    httpRequest.mockImplementation(async (args: { url: string }) =>
      args.url.includes('/internal/connectors/config')
        ? {
            ok: true,
            status: 200,
            data: { baseUrl: 'https://api.anthropic.com/v1', apiKey: 'sk-ant-test' },
          }
        : response,
    );
  }

  const callWithTools = (
    manager: ChatExecutionManager,
    toolCatalog = [filesTool],
    context = makeContext(),
  ) =>
    manager.callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      context,
      Date.now(),
      false,
      undefined,
      undefined,
      { fastPathEnabled: false, applyShortResponseConstraint: false, toolCatalog },
    );

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue(APP_CONFIG);
    accessControl = createFakePaygAccessControl();
  });

  it('sends the tools in Anthropic shape on the cached native body', async () => {
    stubProvider(toolUseReply());
    await callWithTools(build());

    const sent = providerCall();
    expect(sent.url).toBe('https://api.anthropic.com/v1/messages');
    expect(sent.body['cache_control']).toEqual({ type: 'ephemeral' });
    expect(sent.body['tools']).toEqual([
      expect.objectContaining({ name: 'workspace_files', input_schema: expect.any(Object) }),
    ]);
    expect(sent.body['tool_choice']).toEqual({ type: 'auto' });
    expect(sent.body).not.toHaveProperty('tool_calls');
  });

  it('sizes the hold for the tool catalog, which the text estimate cannot see', async () => {
    stubProvider(toolUseReply());
    await callWithTools(build());
    const toolHold = accessControl.reserveCredit.mock.calls[0]?.[0] as Record<string, number>;

    accessControl = createFakePaygAccessControl();
    stubProvider(toolUseReply());
    await callWithTools(build(), []);
    const plainHold = accessControl.reserveCredit.mock.calls[0]?.[0] as Record<string, number>;

    expect(toolHold['promptTokens']).toBeGreaterThan(plainHold['promptTokens'] ?? 0);
    expect(toolHold['cacheWritePromptTokens']).toBe(toolHold['promptTokens']);
  });

  it('sizes the hold for the tool-result history the cached prefix now carries', async () => {
    stubProvider(toolUseReply());
    await callWithTools(build());
    const bareHold = accessControl.reserveCredit.mock.calls[0]?.[0] as Record<string, number>;

    accessControl = createFakePaygAccessControl();
    stubProvider(toolUseReply());
    const withHistory = {
      ...makeContext(),
      toolTurns: [
        {
          assistantText: '',
          calls: [{ callId: 'c1', nativeName: 'workspace_files', arguments: {} }],
          results: [{ callId: 'c1', content: 'x'.repeat(50_000), isError: false }],
        },
      ],
    } as unknown as AssembledContext;
    await callWithTools(build(), [filesTool], withHistory);
    const historyHold = accessControl.reserveCredit.mock.calls[0]?.[0] as Record<string, number>;

    // 50,000 bytes of history at 2.5 bytes per token is at least 20,000 tokens.
    expect(
      (historyHold['promptTokens'] ?? 0) - (bareHold['promptTokens'] ?? 0),
    ).toBeGreaterThanOrEqual(20_000);
    expect(historyHold['cacheWritePromptTokens']).toBe(historyHold['promptTokens']);
  });

  it('returns a tool_use block as a Runtime tool call', async () => {
    stubProvider(toolUseReply());
    const response = await callWithTools(build());

    expect(response.finishReason).toBe('tool_calls');
    expect(response.finishedForTools).toBe(true);
    expect(response.toolCalls).toEqual([
      expect.objectContaining({
        callId: 'toolu_1',
        toolName: 'workspace.files',
        operation: 'read',
        targetId: 'target:workspace',
        arguments: { path: 'a.ts' },
      }),
    ]);
    expect(response.content).toBe('Reading it.');
  });

  it('sends the per-turn tail as the last block, so the cached prefix does not change', async () => {
    const sendWithTail = async (tail: string): Promise<Record<string, unknown>> => {
      httpRequest.mockClear();
      stubProvider(toolUseReply());
      await callWithTools(build(), [filesTool], {
        ...makeContext(),
        systemPromptTail: tail,
      } as AssembledContext);
      return providerCall().body;
    };

    const turn1 = await sendWithTail('The trusted executor returned this redacted tool result: A');
    const turn2 = await sendWithTail('The trusted executor returned this redacted tool result: B');

    type Sent = { role: string; content: Array<{ text?: string }> };
    const lastMessage = (body: Record<string, unknown>): Sent =>
      (body['messages'] as Sent[]).at(-1) as Sent;
    expect(turn1['system']).toEqual(turn2['system']);
    expect(turn1['tools']).toEqual(turn2['tools']);
    expect(JSON.stringify(turn1['system'])).not.toContain('tool result');
    expect(lastMessage(turn1).content.at(-1)?.text).toContain('result: A');
    expect(lastMessage(turn2).content.at(-1)?.text).toContain('result: B');
    // Everything before the tail block is byte-identical between the two turns.
    expect(lastMessage(turn1).content.slice(0, -1)).toEqual(
      lastMessage(turn2).content.slice(0, -1),
    );
  });

  it('a compare lane hold does not cover a call that carries a tool catalog', async () => {
    stubProvider(toolUseReply());
    const manager = build();
    const hold = await manager.reserveCompareLane({
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      context: makeContext(),
      requestId: 'group:compare-lane:0',
    });
    shouldCache.mockClear();
    await manager.callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
      undefined,
      undefined,
      { fastPathEnabled: false, applyShortResponseConstraint: false, toolCatalog: [filesTool] },
      undefined,
      { hold },
    );
    expect(shouldCache).toHaveBeenCalledWith(
      expect.objectContaining({ holdSuppliedByCaller: true }),
    );
  });

  it('keeps the call uncached when the catalog is over the byte budget', async () => {
    appConfigGet.mockReturnValue({ ...APP_CONFIG, CHAT_TOOL_CATALOG_MAX_BYTES: 10 });
    stubProvider({
      ok: true,
      status: 200,
      data: {
        choices: [{ message: { content: 'plain' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      },
    });
    const manager = build();
    shouldCache.mockResolvedValue(false);
    await callWithTools(manager);

    expect(shouldCache).toHaveBeenCalledWith(expect.objectContaining({ toolsUnavailable: true }));
    expect(providerCall().url).toContain('/chat/completions');
  });
});
