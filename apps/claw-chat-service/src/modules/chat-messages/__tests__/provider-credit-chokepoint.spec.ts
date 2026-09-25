import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { PaygSurface } from '@claw/shared-types';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ProviderStreamExecutor } from '../managers/provider-stream-executor.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { StreamCancellationService } from '../services/stream-cancellation.service';
import type { AssembledContext } from '../types/context.types';
import type { MessageRoutedData } from '../types/execution.types';
import { ProviderCreditExhaustedException } from '../../../common/errors';
import {
  PROVIDER_CREDIT_EXHAUSTED_CODE,
  PROVIDER_CREDIT_RETRY_REQUEST_SUFFIX,
} from '../constants/provider-credit.constants';
import { OUTPUT_BOUNDS_HOSTED_DEFAULT_MAX_OUTPUT_TOKENS } from '../constants/output-token-bounds.constants';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
  }),
}));
const { affordableOutputTokens } = vi.hoisted(() => ({ affordableOutputTokens: vi.fn() }));
vi.mock('../clients/provider-credit-headroom.client', () => ({
  ProviderCreditHeadroomClient: vi.fn(function () {
    return { affordableOutputTokens };
  }),
}));
vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  httpStream: vi.fn(),
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-token'),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined =>
    !record ? undefined : (Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined),
}));

const { httpRequest, httpStream } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
  httpStream: Mock;
};
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const KEY_HASH = 'f00dfeedcafe1234';
// Production's body, 2026-09-25 (key hash substituted).
const openRouter402 = (affordable: number | null): unknown => ({
  error: {
    message:
      affordable === null
        ? `This request requires more credits. To increase, visit https://openrouter.ai/workspaces/default/keys/${KEY_HASH}`
        : `This request requires more credits, or fewer max_tokens. You requested up to 31776 tokens, but can only afford ${String(affordable)}. To increase, visit https://openrouter.ai/workspaces/default/keys/${KEY_HASH} and adjust the key's total limit`,
    code: 402,
  },
});

const makeContext = (): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'm1', threadId: 'thread-1', role: 'USER', content: 'hello' }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRequested: false,
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

const connectorConfig = {
  ok: true,
  status: 200,
  data: { baseUrl: 'https://openrouter.ai/api/v1', apiKey: 'sk-or-secret' },
};
const cloudOk = {
  ok: true,
  status: 200,
  data: {
    choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  },
};

async function* sseChunks(): AsyncGenerator<string> {
  yield 'data: {"choices":[{"delta":{"content":"streamed answer"}}]}\n\n';
  yield 'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":3}}\n\n';
  yield 'data: [DONE]\n\n';
}

// Every ChatStreamService method the executor or manager touches, as a no-op.
function fakeStreamService(): ChatStreamService {
  const fns = new Map<PropertyKey, Mock>();
  return new Proxy(
    {},
    {
      get: (_target, property) => {
        if (property === 'startResponseProgressHeartbeat') {
          return () => () => {};
        }
        const existing = fns.get(property);
        if (existing !== undefined) {
          return existing;
        }
        const created = vi.fn();
        fns.set(property, created);
        return created;
      },
    },
  ) as unknown as ChatStreamService;
}

function build(
  access: ReturnType<typeof createFakePaygAccessControl>,
  streaming: boolean,
): ChatExecutionManager {
  const streamService = fakeStreamService();
  return new ChatExecutionManager(
    {
      buildPromptString: vi.fn().mockReturnValue('a prompt of some length'),
      buildChatMessages: vi.fn().mockReturnValue([{ role: 'user', content: 'hi' }]),
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
    streamService,
    {
      run: vi.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
        context: ctx,
        outcome: { applied: false, results: [], runId: null, warning: null },
      })),
    } as unknown as SearchFirstManager,
    access as unknown as AccessControlService,
    { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as unknown as GeminiFilesApiManager,
    undefined,
    streaming ? new ProviderStreamExecutor(streamService) : undefined,
    streaming
      ? ({
          register: () => new AbortController(),
          release: vi.fn(),
        } as unknown as StreamCancellationService)
      : undefined,
  );
}

const providerCalls = (): Array<{ body: { max_tokens?: number } }> =>
  httpRequest.mock.calls
    .map((call) => call[0] as { url: string; body: { max_tokens?: number } })
    .filter((args) => !args.url.includes('/internal/connectors/config'));

describe('provider credit — the buffered chokepoint', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;
  let manager: ChatExecutionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    affordableOutputTokens.mockResolvedValue(undefined);
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      ENABLE_GEMINI_FILES_API: false,
      ENABLE_ANTHROPIC_NATIVE_PDF: false,
    });
    access = createFakePaygAccessControl();
    manager = build(access, false);
  });

  const queueProvider = (...responses: unknown[]): void => {
    const queue = [...responses];
    httpRequest.mockImplementation(async (args: { url: string }) =>
      args.url.includes('/internal/connectors/config') ? connectorConfig : queue.shift(),
    );
  };

  it('retries ONCE at 90% of "can only afford N", as a distinct PAYG hold', async () => {
    queueProvider({ ok: false, status: 402, data: openRouter402(9063) }, cloudOk);

    const response = await manager.callProvider(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { requestId: 'req-1', threadId: 'thread-1' },
    );

    expect(response.content).toBe('answer');
    const calls = providerCalls();
    expect(calls).toHaveLength(2);
    expect(calls[1]?.body.max_tokens).toBe(8156);
    // Two holds: the failed attempt's (released) and the retry's (settled).
    expect(access.reserveCredit).toHaveBeenCalledTimes(2);
    const first = access.reserveCredit.mock.calls[0]?.[0] as { requestId: string };
    const second = access.reserveCredit.mock.calls[1]?.[0] as {
      requestId: string;
      requestedMaxOutputTokens: number;
    };
    expect(first.requestId).toBe('req-1');
    expect(second.requestId).toBe(`req-1${PROVIDER_CREDIT_RETRY_REQUEST_SUFFIX}`);
    expect(second.requestedMaxOutputTokens).toBe(8156);
    expect(access.releaseCredit).toHaveBeenCalledTimes(1);
    expect(access.releaseCredit.mock.calls[0]?.[1]).toBe('PROVIDER_ERROR');
    expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
  });

  it('never loops: a second credit refusal is thrown, both holds released', async () => {
    queueProvider(
      { ok: false, status: 402, data: openRouter402(9063) },
      { ok: false, status: 402, data: openRouter402(5000) },
      cloudOk,
    );

    await expect(
      manager.callProvider('OPENROUTER', 'z-ai/glm-5.3', makeContext(), Date.now(), false),
    ).rejects.toBeInstanceOf(ProviderCreditExhaustedException);
    expect(providerCalls()).toHaveLength(2);
    expect(access.reserveCredit).toHaveBeenCalledTimes(2);
    expect(access.releaseCredit).toHaveBeenCalledTimes(2);
    expect(access.finalizeCredit).not.toHaveBeenCalled();
  });

  it('does not retry without a stated ceiling, and the error carries no URL', async () => {
    queueProvider({ ok: false, status: 402, data: openRouter402(null) }, cloudOk);

    const error = (await manager
      .callProvider('OPENROUTER', 'z-ai/glm-5.3', makeContext(), Date.now(), false)
      .catch((caught: unknown) => caught)) as ProviderCreditExhaustedException;

    expect(error.code).toBe(PROVIDER_CREDIT_EXHAUSTED_CODE);
    expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(error.message).not.toMatch(/https?:\/\//u);
    expect(JSON.stringify(error.getResponse())).not.toContain(KEY_HASH);
    expect(providerCalls()).toHaveLength(1);
  });

  it('does not retry when N is too small to answer in', async () => {
    queueProvider({ ok: false, status: 402, data: openRouter402(200) }, cloudOk);
    await expect(
      manager.callProvider('OPENROUTER', 'z-ai/glm-5.3', makeContext(), Date.now(), false),
    ).rejects.toMatchObject({ code: PROVIDER_CREDIT_EXHAUSTED_CODE });
    expect(providerCalls()).toHaveLength(1);
  });

  it('a compare lane with a caller hold reserves its OWN hold for the retry', async () => {
    queueProvider({ ok: false, status: 402, data: openRouter402(9063) }, cloudOk);
    const laneHold = { ...access.hold, reservationId: 'lane-hold' };

    await manager.callProvider(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { hold: laneHold, requestId: 'lane-1', surface: PaygSurface.COMPARE },
    );

    // The lane hold was used for attempt one (no reserve), then released.
    expect(access.releaseCredit.mock.calls[0]?.[0]).toBe(laneHold);
    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
    expect(access.reserveCredit.mock.calls[0]?.[0]).toMatchObject({
      requestId: `lane-1${PROVIDER_CREDIT_RETRY_REQUEST_SUFFIX}`,
      surface: PaygSurface.COMPARE,
    });
  });

  it('keeps an explicit smaller cap smaller than the retry ceiling', async () => {
    queueProvider({ ok: false, status: 402, data: openRouter402(9063) }, cloudOk);
    await manager.callProvider(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      false,
      undefined,
      undefined,
      { fastPathEnabled: false, applyShortResponseConstraint: false, maxOutputTokens: 2000 },
    );
    // First call already at 2000 still over; the retry never RAISES the cap.
    expect(providerCalls()[1]?.body.max_tokens).toBe(2000);
  });
});

describe('provider credit — the streaming chokepoint', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;
  let manager: ChatExecutionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    affordableOutputTokens.mockResolvedValue(undefined);
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      ENABLE_GEMINI_FILES_API: false,
      ENABLE_ANTHROPIC_NATIVE_PDF: false,
    });
    access = createFakePaygAccessControl();
    manager = build(access, true);
    httpRequest.mockResolvedValue(connectorConfig);
  });

  const streamBodies = (): Array<{ max_tokens?: number }> =>
    httpStream.mock.calls.map((call) => (call[0] as { body: { max_tokens?: number } }).body);

  it('sends the hosted default output budget, not the model maximum', async () => {
    httpStream.mockResolvedValueOnce({ ok: true, status: 200, chunks: sseChunks() });

    await manager.streamModelForLane(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      undefined,
      { threadId: 'thread-1', messageId: 'msg-1' },
    );

    expect(streamBodies()[0]?.max_tokens).toBe(OUTPUT_BOUNDS_HOSTED_DEFAULT_MAX_OUTPUT_TOKENS);
    const reserved = access.reserveCredit.mock.calls[0]?.[0] as {
      requestedMaxOutputTokens: number;
    };
    expect(reserved.requestedMaxOutputTokens).toBe(OUTPUT_BOUNDS_HOSTED_DEFAULT_MAX_OUTPUT_TOKENS);
  });

  it('retries a 402 stream once with the lowered cap and streams the answer', async () => {
    httpStream
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        errorBody: JSON.stringify(openRouter402(9063)),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, chunks: sseChunks() });

    const response = await manager.streamModelForLane(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      undefined,
      { threadId: 'thread-1', messageId: 'msg-1' },
    );

    expect(response.content).toBe('streamed answer');
    expect(streamBodies()).toHaveLength(2);
    expect(streamBodies()[1]?.max_tokens).toBe(8156);
    expect(access.reserveCredit).toHaveBeenCalledTimes(2);
    expect(access.releaseCredit).toHaveBeenCalledTimes(1);
    expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
  });

  it('a whole turn that fails on credit never surfaces the provider URL', async () => {
    httpStream.mockResolvedValue({
      ok: false,
      status: 402,
      errorBody: JSON.stringify(openRouter402(null)),
    });
    const payload = {
      messageId: 'msg-1',
      threadId: 'thread-1',
      selectedProvider: 'OPENROUTER',
      selectedModel: 'z-ai/glm-5.3',
      routingMode: 'MANUAL_MODEL',
    } as MessageRoutedData;

    const error = (await manager
      .execute(payload, makeContext())
      .catch((caught: unknown) => caught)) as Error & { code?: string };

    expect(error.message).not.toMatch(/https?:\/\//u);
    expect(error.message).not.toContain(KEY_HASH);
    expect(error.code).toBe(PROVIDER_CREDIT_EXHAUSTED_CODE);
  });
});

describe('provider credit — pre-flight affordability', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      ENABLE_GEMINI_FILES_API: false,
      ENABLE_ANTHROPIC_NATIVE_PDF: false,
    });
    access = createFakePaygAccessControl();
    httpRequest.mockImplementation(async (args: { url: string }) =>
      args.url.includes('/internal/connectors/config') ? connectorConfig : cloudOk,
    );
  });

  it('caps the buffered call AND the PAYG hold at what the key can afford', async () => {
    affordableOutputTokens.mockResolvedValue(4_000);
    await build(access, false).callProvider(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      false,
    );

    expect(affordableOutputTokens).toHaveBeenCalledWith(
      'OPENROUTER',
      'z-ai/glm-5.3',
      expect.any(Number),
    );
    expect(providerCalls()[0]?.body.max_tokens).toBe(4_000);
    expect(access.reserveCredit.mock.calls[0]?.[0]).toMatchObject({
      requestedMaxOutputTokens: 4_000,
    });
  });

  it('never widens a smaller existing cap (quota / thread / fast path)', async () => {
    affordableOutputTokens.mockResolvedValue(4_000);
    await build(access, false).callProvider(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      false,
      undefined,
      undefined,
      { fastPathEnabled: true, applyShortResponseConstraint: true, maxOutputTokens: 512 },
    );
    expect(providerCalls()[0]?.body.max_tokens).toBe(512);
  });

  it('leaves the request untouched when the key can afford the default', async () => {
    affordableOutputTokens.mockResolvedValue(1_000_000);
    await build(access, false).callProvider(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      false,
    );
    expect(providerCalls()[0]?.body.max_tokens).toBeUndefined();
  });

  it('fails fast below the minimum answer size: no hold, no provider call', async () => {
    affordableOutputTokens.mockResolvedValue(100);
    await expect(
      build(access, false).callProvider(
        'OPENROUTER',
        'z-ai/glm-5.3',
        makeContext(),
        Date.now(),
        false,
      ),
    ).rejects.toMatchObject({
      code: PROVIDER_CREDIT_EXHAUSTED_CODE,
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    expect(access.reserveCredit).not.toHaveBeenCalled();
    expect(providerCalls()).toHaveLength(0);
  });

  it('caps the streaming body the same way', async () => {
    affordableOutputTokens.mockResolvedValue(3_000);
    httpStream.mockResolvedValueOnce({ ok: true, status: 200, chunks: sseChunks() });
    await build(access, true).streamModelForLane(
      'OPENROUTER',
      'z-ai/glm-5.3',
      makeContext(),
      Date.now(),
      undefined,
      { threadId: 'thread-1', messageId: 'msg-1' },
    );
    const body = (httpStream.mock.calls[0]?.[0] as { body: { max_tokens?: number } }).body;
    expect(body.max_tokens).toBe(3_000);
  });

  it('a pre-flight refusal lets AUTO fall through to the next provider', async () => {
    affordableOutputTokens.mockImplementation(async (provider: string) =>
      provider === 'OPENROUTER' ? 10 : undefined,
    );
    const payload = {
      messageId: 'msg-1',
      threadId: 'thread-1',
      selectedProvider: 'OPENROUTER',
      selectedModel: 'z-ai/glm-5.3',
      routingMode: 'AUTO',
      fallbackChain: [{ provider: 'OPENAI', model: 'gpt-4o' }],
    } as unknown as MessageRoutedData;

    const response = await build(access, false).execute(payload, makeContext());
    expect(response.provider).toBe('OPENAI');
  });
});
