import { type Mock, vi } from 'vitest';
import { PaygBillingMode, PaygSurface } from '@claw/shared-types';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import {
  BusinessException,
  StreamCeilingError,
  StreamIdleTimeoutError,
} from '../../../common/errors';
import type { InternalGenerateArgs } from '../types/internal-generate.types';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
  }),
}));
vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  httpStream: vi.fn(),
  buildInterServiceAuthHeader: () => 'Service test-token',
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined =>
    !record ? undefined : Object.entries(record).find(([k]) => k === key)?.[1],
  buildFileDeliveryEntries: vi.fn().mockReturnValue([]),
}));

const { httpRequest, httpStream } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
  httpStream: Mock;
};
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const APP_CONFIG = {
  OLLAMA_SERVICE_URL: 'http://ollama:4008',
  OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
  CONNECTOR_SERVICE_URL: 'http://connector:4011',
  AUTH_SERVICE_URL: 'http://auth:4001',
};

const buildExecution = (
  access: ReturnType<typeof createFakePaygAccessControl>,
): ChatExecutionManager =>
  new ChatExecutionManager(
    {
      buildPromptString: vi.fn().mockReturnValue('prompt'),
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
    {
      emitProgressStage: vi.fn(),
      emitError: vi.fn(),
    } as unknown as ChatStreamService,
    { run: vi.fn() } as unknown as SearchFirstManager,
    access as unknown as AccessControlService,
    { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as unknown as GeminiFilesApiManager,
    {
      resolveDefaultModel: vi.fn().mockResolvedValue('qwen3:1.7b'),
      resolveModelList: vi.fn().mockResolvedValue(['qwen3:7b']),
    } as unknown as LocalModelSelectionService,
  );

const ARGS: InternalGenerateArgs = {
  userId: 'user-1',
  requestId: 'job-1:author-1:round-1',
  threadJobBudgetId: 'budget-1',
  surface: PaygSurface.THREADS,
  provider: 'OLLAMA',
  model: 'kimi-k2.6',
  systemPrompt: 'sys',
  userPrompt: 'write the draft',
  workflow: 'threads_generation',
};

const connector = (extra: Record<string, unknown> = {}): unknown => ({
  ok: true,
  status: 200,
  data: { baseUrl: 'https://ollama.com/api', apiKey: 'provider-key', ...extra },
});

async function* chunksOf(...pieces: string[]): AsyncGenerator<string> {
  for (const piece of pieces) {
    yield await Promise.resolve(piece);
  }
}

const frame = (value: Record<string, unknown>): string => `${JSON.stringify(value)}\n`;
const sse = (value: unknown): string => `data: ${JSON.stringify(value)}\n\n`;

const streamOk = (...pieces: string[]): unknown => ({
  ok: true,
  status: 200,
  chunks: chunksOf(...pieces),
});

/** A stream that yields its chunks and then fails the way httpStream does. */
function streamThatFails(error: unknown, ...pieces: string[]): unknown {
  async function* chunks(): AsyncGenerator<string> {
    for (const piece of pieces) {
      yield await Promise.resolve(piece);
    }
    throw error;
  }
  return { ok: true, status: 200, chunks: chunks() };
}

const OLLAMA_ANSWER = [
  frame({ message: { role: 'assistant', content: '', thinking: 'planning the draft' } }),
  frame({ message: { role: 'assistant', content: 'The draft ' } }),
  frame({ message: { role: 'assistant', content: 'text.' } }),
  frame({
    message: { role: 'assistant', content: '' },
    done: true,
    done_reason: 'stop',
    prompt_eval_count: 120,
    eval_count: 45,
  }),
];

describe('generateOnceStream', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;
  let manager: ChatExecutionManager;
  let onActivity: Mock;
  let caller: AbortController;

  const run = (args: InternalGenerateArgs = ARGS) =>
    manager.generateOnceStream(args, { signal: caller.signal, onActivity });

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue(APP_CONFIG);
    access = createFakePaygAccessControl();
    manager = buildExecution(access);
    onActivity = vi.fn();
    caller = new AbortController();
    httpRequest.mockResolvedValue(connector());
  });

  describe('a native Ollama stream', () => {
    beforeEach(() => {
      httpStream.mockResolvedValue(streamOk(...OLLAMA_ANSWER));
    });

    it('streams from the provider with the idle clock, the ceiling and the caller signal', async () => {
      await run();

      const call = httpStream.mock.calls[0]?.[0];
      expect(call.url).toBe('https://ollama.com/api/chat');
      expect(call.method).toBe('POST');
      expect(call.timeoutMs).toBe(300_000);
      expect(call.maxTotalMs).toBe(600_000);
      expect(call.signal).toBe(caller.signal);
      expect(call.headers).toEqual({ Authorization: 'Bearer provider-key' });
      expect(httpRequest).toHaveBeenCalledTimes(1); // the connector lookup only
    });

    it('asks for a stream, keeps thinking off, and caps output at the hold ceiling', async () => {
      await run();

      const body = httpStream.mock.calls[0]?.[0].body;
      expect(body.stream).toBe(true);
      expect(body.think).toBe(false);
      expect(body.options.num_predict).toBeGreaterThan(0);
      expect(body.messages).toEqual([
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'write the draft' },
      ]);
    });

    it('lets the caller switch thinking on', async () => {
      await run({ ...ARGS, thinking: true });

      expect(httpStream.mock.calls[0]?.[0].body.think).toBe(true);
    });

    it('returns the answer without the thinking, with measured tokens', async () => {
      const result = await run();

      expect(result).toMatchObject({
        content: 'The draft text.',
        provider: 'OLLAMA',
        model: 'kimi-k2.6',
        inputTokens: 120,
        outputTokens: 45,
        clamped: false,
      });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('reserves once before the call and settles once after it, never releasing', async () => {
      await run();

      expect(access.reserveCredit).toHaveBeenCalledTimes(1);
      expect(access.reserveCredit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          requestId: 'job-1:author-1:round-1',
          threadJobBudgetId: 'budget-1',
          surface: PaygSurface.THREADS,
          workflow: 'threads_generation',
        }),
      );
      expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
      expect(access.finalizeCredit).toHaveBeenCalledWith(
        access.hold,
        expect.objectContaining({ promptTokens: 120, completionTokens: 45 }),
        expect.anything(),
      );
      expect(access.releaseCredit).not.toHaveBeenCalled();
      const order = [
        access.reserveCredit.mock.invocationCallOrder[0] ?? 0,
        httpStream.mock.invocationCallOrder[0] ?? 0,
        access.finalizeCredit.mock.invocationCallOrder[0] ?? 0,
      ];
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it('reports activity for every chunk the provider sent, thinking included', async () => {
      await run();

      expect(onActivity).toHaveBeenCalledTimes(OLLAMA_ANSWER.length);
      expect(onActivity.mock.calls.map(([chars]) => chars)).toEqual(
        OLLAMA_ANSWER.map((piece) => piece.length),
      );
    });

    it('reports a clamped answer', async () => {
      access = createFakePaygAccessControl({ clamped: true, maxOutputTokens: 500 });
      manager = buildExecution(access);

      const result = await run();

      expect(result.clamped).toBe(true);
      expect(httpStream.mock.calls[0]?.[0].body.options.num_predict).toBeLessThanOrEqual(500);
    });
  });

  describe('the cost on the result', () => {
    beforeEach(() => {
      httpStream.mockImplementation(() => Promise.resolve(streamOk(...OLLAMA_ANSWER)));
    });

    it('carries the settled cost for a pay-as-you-go user', async () => {
      access.finalizeCredit.mockResolvedValueOnce({
        settled: true,
        billingMode: PaygBillingMode.PAYG,
        settledCostMicroUsd: 21_000,
      });

      expect((await run()).costMicroUsd).toBe(21_000);
    });

    it('keeps a real zero', async () => {
      access.finalizeCredit.mockResolvedValueOnce({
        settled: true,
        billingMode: PaygBillingMode.PAYG,
        settledCostMicroUsd: 0,
      });

      expect((await run()).costMicroUsd).toBe(0);
    });

    it('omits it for a subscriber, however the settlement is phrased', async () => {
      access.finalizeCredit.mockResolvedValueOnce({
        settled: true,
        billingMode: PaygBillingMode.SUBSCRIPTION,
        settledCostMicroUsd: 21_000,
      });

      expect(await run()).not.toHaveProperty('costMicroUsd');
    });

    it('omits it for an unmetered hold even if the reply names PAYG', async () => {
      access = createFakePaygAccessControl({ metered: false });
      manager = buildExecution(access);
      access.finalizeCredit.mockResolvedValueOnce({
        settled: true,
        billingMode: PaygBillingMode.PAYG,
        settledCostMicroUsd: 21_000,
      });

      expect(await run()).not.toHaveProperty('costMicroUsd');
    });

    it('omits it when there is no settlement reply', async () => {
      expect(await run()).not.toHaveProperty('costMicroUsd');
    });
  });

  describe('an OpenAI-compatible stream', () => {
    const OPENAI_ARGS: InternalGenerateArgs = { ...ARGS, provider: 'OPENROUTER', model: 'gpt-5' };

    beforeEach(() => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { baseUrl: 'https://openrouter.example/v1', apiKey: 'or-key' },
      });
      httpStream.mockResolvedValue(
        streamOk(
          ': keep-alive\n\n',
          sse({ choices: [{ delta: { content: 'Hello ' } }] }),
          sse({ choices: [{ delta: { content: 'there' }, finish_reason: 'stop' }] }),
          sse({
            choices: [],
            usage: {
              prompt_tokens: 30,
              completion_tokens: 8,
              total_tokens: 38,
              prompt_tokens_details: { cached_tokens: 10 },
              completion_tokens_details: { reasoning_tokens: 2 },
            },
          }),
          'data: [DONE]\n\n',
        ),
      );
    });

    it('asks for usage on the stream and settles on the measured split', async () => {
      const result = await run(OPENAI_ARGS);

      const call = httpStream.mock.calls[0]?.[0];
      expect(call.url).toBe('https://openrouter.example/v1/chat/completions');
      expect(call.body.stream).toBe(true);
      expect(call.body.stream_options).toEqual({ include_usage: true });
      expect(call.body).not.toHaveProperty('think');
      expect(result.content).toBe('Hello there');
      expect(access.finalizeCredit).toHaveBeenCalledWith(
        access.hold,
        expect.objectContaining({
          promptTokens: 30,
          completionTokens: 8,
          cachedPromptTokens: 10,
          reasoningTokens: 2,
        }),
        expect.anything(),
      );
    });

    it('counts the keep-alive comment as activity', async () => {
      await run(OPENAI_ARGS);

      expect(onActivity).toHaveBeenCalledTimes(5);
    });
  });

  describe('a model that answered nothing', () => {
    it('names a model that spent its budget thinking, and gives the hold back', async () => {
      httpStream.mockResolvedValue(
        streamOk(
          frame({ message: { content: '', thinking: 'thinking, thinking' } }),
          frame({ message: { content: '' }, done: true, done_reason: 'length', eval_count: 4096 }),
        ),
      );

      await expect(run()).rejects.toMatchObject({ code: 'MODEL_REASONED_NO_ANSWER' });

      expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'PROVIDER_ERROR');
      expect(access.finalizeCredit).not.toHaveBeenCalled();
    });

    it('keeps the empty-envelope code for a provider that returned nothing at all', async () => {
      httpStream.mockResolvedValue(
        streamOk(frame({ message: { content: '' }, done: true, done_reason: 'stop' })),
      );

      await expect(run()).rejects.toMatchObject({ code: 'CLOUD_PROVIDER_EMPTY_RESPONSE' });
      expect(access.releaseCredit).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the call dies', () => {
    it('reads 300 s of silence as MODEL_IDLE_TIMEOUT and releases the hold as a timeout', async () => {
      httpStream.mockResolvedValue(
        streamThatFails(new StreamIdleTimeoutError(300_000), OLLAMA_ANSWER[0] ?? ''),
      );

      await expect(run()).rejects.toMatchObject({ code: 'MODEL_IDLE_TIMEOUT' });

      expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'TIMEOUT');
      expect(access.finalizeCredit).not.toHaveBeenCalled();
    });

    it('reads the ceiling as MODEL_HARD_CEILING while chunks were still flowing', async () => {
      httpStream.mockResolvedValue(
        streamThatFails(new StreamCeilingError(600_000), OLLAMA_ANSWER[1] ?? ''),
      );

      await expect(run()).rejects.toMatchObject({ code: 'MODEL_HARD_CEILING' });

      expect(onActivity).toHaveBeenCalled();
      expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'TIMEOUT');
    });

    it('reads a failure to connect inside the idle window the same way', async () => {
      httpStream.mockRejectedValue(new StreamIdleTimeoutError(300_000));

      await expect(run()).rejects.toMatchObject({ code: 'MODEL_IDLE_TIMEOUT' });
      expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'TIMEOUT');
    });

    it('releases the hold as cancelled when the caller goes away mid-call', async () => {
      httpStream.mockImplementation(async (options: { signal: AbortSignal }) => {
        caller.abort();
        return Promise.reject(options.signal.reason ?? new DOMException('aborted', 'AbortError'));
      });

      await expect(run()).rejects.toMatchObject({ code: 'CLIENT_ABORTED' });

      expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'CANCELLED');
      expect(access.finalizeCredit).not.toHaveBeenCalled();
    });

    it('settles on the streamed-character estimate when the caller cancels after text arrived (ADR-175 addendum)', async () => {
      const text = 'x'.repeat(400);
      async function* cutByCaller(): AsyncGenerator<string> {
        yield await Promise.resolve(frame({ message: { role: 'assistant', content: text } }));
        caller.abort();
        throw new DOMException('aborted', 'AbortError');
      }
      httpStream.mockResolvedValue({ ok: true, status: 200, chunks: cutByCaller() });

      await expect(run()).rejects.toMatchObject({ code: 'CLIENT_ABORTED' });

      expect(access.releaseCredit).not.toHaveBeenCalled();
      expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
      // The wire frame is 448 chars (400 of text plus its JSON envelope) / 4 = 112 output tokens; "sys\nwrite the draft" = 19 chars -> 5.
      expect(access.finalizeCredit.mock.calls[0]?.[1]).toMatchObject({
        promptTokens: 5,
        completionTokens: 112,
      });
    });

    it('caps the cancelled settlement at the hold ceiling', async () => {
      access = createFakePaygAccessControl({ maxOutputTokens: 30 });
      manager = buildExecution(access);
      async function* cutByCaller(): AsyncGenerator<string> {
        yield await Promise.resolve(
          frame({ message: { role: 'assistant', content: 'y'.repeat(4000) } }),
        );
        caller.abort();
        throw new DOMException('aborted', 'AbortError');
      }
      httpStream.mockResolvedValue({ ok: true, status: 200, chunks: cutByCaller() });

      await expect(run()).rejects.toMatchObject({ code: 'CLIENT_ABORTED' });

      expect(access.finalizeCredit.mock.calls[0]?.[1]).toMatchObject({ completionTokens: 30 });
    });

    it('passes a provider refusal through with its own code and releases the hold', async () => {
      httpStream.mockResolvedValue({
        ok: false,
        status: 500,
        errorBody: 'upstream exploded',
        chunks: chunksOf(),
      });

      await expect(run()).rejects.toBeInstanceOf(BusinessException);
      expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'PROVIDER_ERROR');
    });

    it('never dials the provider when the credit is refused', async () => {
      access = createFakePaygAccessControl({
        refuseWith: new BusinessException('Out of credit', 'PAYG_CREDIT_INSUFFICIENT', 402),
      });
      manager = buildExecution(access);

      await expect(run()).rejects.toMatchObject({ code: 'PAYG_CREDIT_INSUFFICIENT' });

      expect(httpStream).not.toHaveBeenCalled();
      expect(access.releaseCredit).not.toHaveBeenCalled();
    });
  });

  describe('a provider that cannot stream', () => {
    const BUFFERED_REPLY = {
      ok: true,
      status: 200,
      data: {
        model: 'kimi-k2.6',
        message: { role: 'assistant', content: 'buffered answer' },
        done: true,
        done_reason: 'stop',
        prompt_eval_count: 7,
        eval_count: 3,
      },
    };

    it('falls back to one buffered call under the larger ceiling, with no activity at all', async () => {
      httpRequest
        .mockResolvedValueOnce(connector({ supportsStreaming: false }))
        .mockResolvedValueOnce(BUFFERED_REPLY);

      const result = await run();

      expect(httpStream).not.toHaveBeenCalled();
      const call = httpRequest.mock.calls[1]?.[0];
      expect(call.timeoutMs).toBe(600_000);
      expect(call.signal).toBe(caller.signal);
      expect(call.body.stream).toBe(false);
      expect(result.content).toBe('buffered answer');
      expect(onActivity).not.toHaveBeenCalled();
      expect(access.finalizeCredit).toHaveBeenCalledTimes(1);
    });

    it('reads the buffered ceiling as MODEL_HARD_CEILING and releases the hold as a timeout', async () => {
      httpRequest
        .mockResolvedValueOnce(connector({ supportsStreaming: false }))
        .mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'));

      await expect(run()).rejects.toMatchObject({ code: 'MODEL_HARD_CEILING' });
      expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'TIMEOUT');
    });

    it('reads a provider that answered stream:true with one JSON document as the buffered reply it is', async () => {
      httpRequest.mockResolvedValue({
        ok: true,
        status: 200,
        data: { baseUrl: 'https://plain.example/v1', apiKey: 'k' },
      });
      httpStream.mockResolvedValue(
        streamOk(
          JSON.stringify({
            id: 'cmpl-1',
            choices: [{ message: { role: 'assistant', content: 'plain' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
          }),
        ),
      );

      const result = await run({ ...ARGS, provider: 'OPENAI', model: 'gpt-5' });

      expect(result.content).toBe('plain');
      expect(result.inputTokens).toBe(4);
    });
  });
});

describe('generateOnce (the buffered endpoint)', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;
  let manager: ChatExecutionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue(APP_CONFIG);
    access = createFakePaygAccessControl();
    manager = buildExecution(access);
    httpRequest.mockReset();
    httpRequest.mockResolvedValueOnce(connector());
  });

  const bufferedReply = (message: Record<string, unknown>): unknown => ({
    ok: true,
    status: 200,
    data: { model: 'kimi-k2.6', message, done: true, done_reason: 'stop', eval_count: 9 },
  });

  it('sends think:false to Ollama unless the caller asks, as the chat path does', async () => {
    httpRequest.mockResolvedValueOnce(bufferedReply({ role: 'assistant', content: 'ok' }));

    await manager.generateOnce(ARGS);

    expect(httpRequest.mock.calls[1]?.[0].body.think).toBe(false);
    expect(httpRequest.mock.calls[1]?.[0].body.stream).toBe(false);
  });

  it('lets the caller switch thinking on', async () => {
    httpRequest.mockResolvedValueOnce(bufferedReply({ role: 'assistant', content: 'ok' }));

    await manager.generateOnce({ ...ARGS, thinking: true });

    expect(httpRequest.mock.calls[1]?.[0].body.think).toBe(true);
  });

  it('maps a thinking-only reply to MODEL_REASONED_NO_ANSWER and releases the hold', async () => {
    httpRequest.mockResolvedValueOnce(
      bufferedReply({ role: 'assistant', content: '', thinking: 'all spent' }),
    );

    await expect(manager.generateOnce(ARGS)).rejects.toMatchObject({
      code: 'MODEL_REASONED_NO_ANSWER',
    });
    expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'PROVIDER_ERROR');
  });

  it('returns costMicroUsd for a pay-as-you-go user only', async () => {
    httpRequest.mockResolvedValueOnce(bufferedReply({ role: 'assistant', content: 'ok' }));
    access.finalizeCredit.mockResolvedValueOnce({
      settled: true,
      billingMode: PaygBillingMode.PAYG,
      settledCostMicroUsd: 777,
    });

    const paid = await manager.generateOnce(ARGS);

    httpRequest
      .mockResolvedValueOnce(connector())
      .mockResolvedValueOnce(bufferedReply({ role: 'assistant', content: 'ok' }));
    const free = await manager.generateOnce(ARGS);

    expect(paid.costMicroUsd).toBe(777);
    expect(free).not.toHaveProperty('costMicroUsd');
  });

  it('keeps the buffered clock and the raw error for the existing endpoint', async () => {
    const aborted = new DOMException('The operation was aborted.', 'AbortError');
    httpRequest.mockRejectedValueOnce(aborted);

    await expect(manager.generateOnce(ARGS)).rejects.toBe(aborted);

    expect(access.releaseCredit).toHaveBeenCalledWith(access.hold, 'PROVIDER_ERROR');
  });

  it('returns the same result shape as the stream endpoint for the same answer', async () => {
    httpRequest.mockResolvedValueOnce(
      bufferedReply({ role: 'assistant', content: 'The draft text.', thinking: 'planning' }),
    );
    const buffered = await manager.generateOnce(ARGS);

    httpRequest.mockResolvedValue(connector());
    httpStream.mockResolvedValue(streamOk(...OLLAMA_ANSWER));
    const streamed = await manager.generateOnceStream(ARGS, {
      signal: new AbortController().signal,
      onActivity: vi.fn(),
    });

    expect(Object.keys(streamed).sort()).toEqual(Object.keys(buffered).sort());
    expect(streamed.content).toBe(buffered.content);
    expect(streamed.provider).toBe(buffered.provider);
    expect(streamed.model).toBe(buffered.model);
    expect(streamed.clamped).toBe(buffered.clamped);
  });
});
