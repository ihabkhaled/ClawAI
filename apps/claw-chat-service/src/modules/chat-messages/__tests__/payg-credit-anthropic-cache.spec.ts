import { type Mock, vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';

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
import type { AssembledContext } from '../types/context.types';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

/**
 * F093 at the buffered chat chokepoint: an Anthropic model an administrator
 * switched prompt caching on for.
 *
 *  - the PAYG hold is sized for the cache-write premium BEFORE the call;
 *  - the call goes to the real Messages endpoint with x-api-key and a
 *    top-level cache_control breakpoint;
 *  - the settled usage carries the cache write, so it can be billed at the
 *    write rate;
 *  - with the switch off (the default), nothing about the request, the hold or
 *    the settlement changes.
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
  CHAT_NATIVE_TOOL_CALLING_ENABLED: false,
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

// Documented Messages API response shape: input_tokens EXCLUDES the cache counters.
const anthropicColdWrite = (): unknown => ({
  ok: true,
  status: 200,
  data: {
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'cached answer' }],
    stop_reason: 'end_turn',
    usage: {
      input_tokens: 12,
      cache_creation_input_tokens: 8000,
      cache_read_input_tokens: 0,
      output_tokens: 450,
    },
  },
});

const openAiOk = (): unknown => ({
  ok: true,
  status: 200,
  data: {
    choices: [{ message: { content: 'plain answer' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 100, completion_tokens: 40 },
  },
});

describe('Anthropic prompt caching at the chat chokepoint (F093)', () => {
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;
  let shouldCache: Mock;

  const build = (policy: PromptCachePolicyService | undefined): ChatExecutionManager =>
    new ChatExecutionManager(
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
      policy,
    );

  function policyReturning(armed: boolean): PromptCachePolicyService {
    shouldCache = vi.fn().mockResolvedValue(armed);
    return { shouldCache } as unknown as PromptCachePolicyService;
  }

  type SentRequest = {
    url: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  };

  function providerCall(): SentRequest {
    const call = httpRequest.mock.calls.find(
      (entry) => !(entry[0].url as string).includes('/internal/connectors/config'),
    );
    return call?.[0] as SentRequest;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue(APP_CONFIG);
    accessControl = createFakePaygAccessControl();
  });

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

  it('armed: sizes the hold for the write, calls /messages, and settles the cache write', async () => {
    stubProvider(anthropicColdWrite());
    const manager = build(policyReturning(true));

    const response = await manager.callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
    );

    // 1. The hold names the cache-write exposure, so auth sizes it at the write rate.
    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(1);
    const reserved = accessControl.reserveCredit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(reserved['surface']).toBe(PaygSurface.CHAT);
    expect(reserved['cacheWritePromptTokens']).toBe(reserved['promptTokens']);
    expect(reserved['cacheWritePromptTokens']).toBeGreaterThan(0);

    // 2. The request is the real Messages API, authenticated with x-api-key.
    const sent = providerCall();
    expect(sent.url).toBe('https://api.anthropic.com/v1/messages');
    expect(sent.headers['x-api-key']).toBe('sk-ant-test');
    expect(sent.headers['anthropic-version']).toBe('2023-06-01');
    expect(sent.headers).not.toHaveProperty('Authorization');
    expect(sent.body['cache_control']).toEqual({ type: 'ephemeral' });
    expect(sent.body['system']).toEqual([
      { type: 'text', text: 'You are ClawAI.', cache_control: { type: 'ephemeral' } },
    ]);
    // The Messages endpoint REQUIRES max_tokens.
    expect(typeof sent.body['max_tokens']).toBe('number');
    expect(sent.body['max_tokens']).toBeGreaterThan(0);

    // 3. The settlement carries the write, with the prompt reassembled.
    expect(accessControl.finalizeCredit).toHaveBeenCalledTimes(1);
    expect(accessControl.finalizeCredit.mock.calls[0]?.[1]).toEqual({
      promptTokens: 8012,
      completionTokens: 450,
      cachedPromptTokens: 0,
      cacheCreationPromptTokens: 8000,
      reasoningTokens: 0,
    });
    expect(accessControl.releaseCredit).not.toHaveBeenCalled();
    expect(response.content).toBe('cached answer');
    expect(response.cacheCreationPromptTokens).toBe(8000);
  });

  it('reserves BEFORE the provider is called', async () => {
    const order: string[] = [];
    accessControl.reserveCredit.mockImplementation(async () => {
      order.push('reserve');
      return accessControl.hold;
    });
    httpRequest.mockImplementation(async (args: { url: string }) => {
      if (args.url.includes('/internal/connectors/config')) {
        return {
          ok: true,
          status: 200,
          data: { baseUrl: 'https://api.anthropic.com/v1', apiKey: 'k' },
        };
      }
      order.push('provider');
      return anthropicColdWrite();
    });
    await build(policyReturning(true)).callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
    );
    expect(order).toEqual(['reserve', 'provider']);
  });

  it('a warm read settles the cache read and no write', async () => {
    stubProvider({
      ok: true,
      status: 200,
      data: {
        content: [{ type: 'text', text: 'warm' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 25,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 8000,
          output_tokens: 300,
        },
      },
    });
    await build(policyReturning(true)).callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
    );
    const usage = accessControl.finalizeCredit.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(usage).toEqual({
      promptTokens: 8025,
      completionTokens: 300,
      cachedPromptTokens: 8000,
      reasoningTokens: 0,
    });
    expect(usage).not.toHaveProperty('cacheCreationPromptTokens');
  });

  it('an Anthropic reply with no usage block settles on an estimate, never on a guessed write', async () => {
    stubProvider({
      ok: true,
      status: 200,
      data: { content: [{ type: 'text', text: 'no usage' }], stop_reason: 'end_turn' },
    });
    await build(policyReturning(true)).callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
    );
    const usage = accessControl.finalizeCredit.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(usage).not.toHaveProperty('cacheCreationPromptTokens');
    expect(usage['cachedPromptTokens']).toBe(0);
  });

  it('releases the hold when the Messages call fails', async () => {
    httpRequest.mockImplementation(async (args: { url: string }) => {
      if (args.url.includes('/internal/connectors/config')) {
        return {
          ok: true,
          status: 200,
          data: { baseUrl: 'https://api.anthropic.com/v1', apiKey: 'k' },
        };
      }
      throw new Error('socket hang up');
    });
    await expect(
      build(policyReturning(true)).callProvider(
        'ANTHROPIC',
        'claude-sonnet-4',
        makeContext(),
        Date.now(),
        false,
      ),
    ).rejects.toThrow('socket hang up');
    expect(accessControl.releaseCredit).toHaveBeenCalledTimes(1);
    expect(accessControl.finalizeCredit).not.toHaveBeenCalled();
  });

  it('DEFAULT OFF: the switch off leaves the request, the hold and the settlement exactly as before', async () => {
    stubProvider(openAiOk());
    const manager = build(policyReturning(false));

    await manager.callProvider('ANTHROPIC', 'claude-sonnet-4', makeContext(), Date.now(), false);

    const reserved = accessControl.reserveCredit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(reserved).not.toHaveProperty('cacheWritePromptTokens');
    const sent = providerCall();
    expect(sent.url).toBe('https://api.anthropic.com/v1/chat/completions');
    expect(sent.headers).toEqual({ Authorization: 'Bearer sk-ant-test' });
    expect(sent.body).not.toHaveProperty('cache_control');
    expect(accessControl.finalizeCredit.mock.calls[0]?.[1]).toEqual({
      promptTokens: 100,
      completionTokens: 40,
      cachedPromptTokens: 0,
      reasoningTokens: 0,
    });
  });

  it('no policy wired (an older build) behaves as OFF', async () => {
    stubProvider(openAiOk());
    await build(undefined).callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
    );
    expect(providerCall().url).toBe('https://api.anthropic.com/v1/chat/completions');
    expect(accessControl.reserveCredit.mock.calls[0]?.[0]).not.toHaveProperty(
      'cacheWritePromptTokens',
    );
  });

  it('a policy lookup that throws runs the call uncached instead of failing it', async () => {
    stubProvider(openAiOk());
    const policy = {
      shouldCache: vi.fn().mockRejectedValue(new Error('catalog down')),
    } as unknown as PromptCachePolicyService;
    const response = await build(policy).callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
    );
    expect(response.content).toBe('plain answer');
    expect(providerCall().url).toBe('https://api.anthropic.com/v1/chat/completions');
  });

  it('tells the policy when the caller already holds the credit (compare lanes)', async () => {
    stubProvider(openAiOk());
    await build(policyReturning(false)).callProvider(
      'ANTHROPIC',
      'claude-sonnet-4',
      makeContext(),
      Date.now(),
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { hold: accessControl.hold },
    );
    expect(shouldCache).toHaveBeenCalledWith(
      expect.objectContaining({ holdSuppliedByCaller: true, carriesTools: false }),
    );
  });
});
