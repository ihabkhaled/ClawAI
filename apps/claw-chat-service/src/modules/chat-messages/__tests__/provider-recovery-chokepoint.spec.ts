import { type Mock, vi } from 'vitest';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ProviderCircuitBreakerManager } from '../managers/provider-circuit-breaker.manager';
import { ProviderStreamExecutor } from '../managers/provider-stream-executor.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { ModelOutputLimitClient } from '../clients/model-output-limit.client';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { StreamCancellationService } from '../services/stream-cancellation.service';
import type { AssembledContext } from '../types/context.types';
import type { MessageRoutedData } from '../types/execution.types';
import { ProviderOutputLimitException, ProviderRateLimitedException } from '../../../common/errors';
import {
  PROVIDER_CREDIT_EXHAUSTED_CODE,
  PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY,
  PROVIDER_RETRY_REQUEST_SUFFIX,
} from '../constants/provider-credit.constants';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
  }),
}));
vi.mock('../clients/provider-credit-headroom.client', () => ({
  ProviderCreditHeadroomClient: vi.fn(function () {
    return { affordableOutputTokens: vi.fn().mockResolvedValue(undefined) };
  }),
}));
const { delay } = vi.hoisted(() => ({ delay: vi.fn() }));
vi.mock('../utilities/runtime-v2-provider-failure.utility', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  delay,
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

// Verbatim production bodies (2026-09-10..25).
const GROQ_OUTPUT_400 = {
  ok: false,
  status: 400,
  data: {
    error: {
      message:
        '`max_tokens` must be less than or equal to `16384`, the maximum value for `max_tokens` is less than the `context_window` for this model',
      type: 'invalid_request_error',
    },
  },
};
const OPENROUTER_FREE_429 = {
  error: {
    message: 'Provider returned error',
    code: 429,
    metadata: {
      raw: 'z-ai/glm-5.2:free is temporarily rate-limited upstream. Please retry shortly, or add your own key to accumulate your rate limits: https://openrouter.ai/settings/integrations',
    },
  },
};
const OPENAI_NO_CREDITS_429 = {
  ok: false,
  status: 429,
  data: {
    error: {
      message:
        'You have no credits remaining. Add credits to continue using the API: https://platform.openai.com/settings/organization/billing.',
      type: 'insufficient_quota',
      code: 'insufficient_quota',
    },
  },
};
const ANTHROPIC_LOW_BALANCE_400 = {
  ok: false,
  status: 400,
  data: {
    type: 'error',
    error: {
      type: 'invalid_request_error',
      message:
        'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
    },
  },
};
const cloudOk = {
  ok: true,
  status: 200,
  data: {
    choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  },
};
const connectorConfig = {
  ok: true,
  status: 200,
  data: { baseUrl: 'https://api.example.com/v1', apiKey: 'k' },
};

async function* sseChunks(): AsyncGenerator<string> {
  yield 'data: {"choices":[{"delta":{"content":"streamed answer"}}]}\n\n';
  yield 'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":3}}\n\n';
  yield 'data: [DONE]\n\n';
}

// Long and "detailed" so AUTO never takes the fast path (which would escalate
// a short test answer into an extra provider call).
const PROMPT =
  'Please give a detailed, step by step comparison of three database indexing strategies, with trade-offs for write-heavy workloads.';

const makeContext = (): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'm1', threadId: 'thread-1', role: 'USER', content: PROMPT }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRequested: false,
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

function fakeStreamService(): ChatStreamService {
  const fns = new Map<PropertyKey, Mock>();
  return new Proxy(
    {},
    {
      get: (_target, property) => {
        if (property === 'startResponseProgressHeartbeat') {
          return () => () => {};
        }
        const existing = fns.get(property) ?? vi.fn();
        fns.set(property, existing);
        return existing;
      },
    },
  ) as unknown as ChatStreamService;
}

type OutputLimits = { find: Mock; record: Mock };

function build(
  access: ReturnType<typeof createFakePaygAccessControl>,
  limits: OutputLimits,
  streaming = false,
): ChatExecutionManager {
  const streamService = fakeStreamService();
  return new ChatExecutionManager(
    {
      buildPromptString: vi.fn().mockReturnValue('a prompt'),
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
    undefined,
    undefined,
    undefined,
    limits as unknown as ModelOutputLimitClient,
  );
}

const providerBodies = (): Array<{ max_tokens?: number }> =>
  httpRequest.mock.calls
    .map((call) => call[0] as { url: string; body: { max_tokens?: number } })
    .filter((args) => !args.url.includes('/internal/connectors/config'))
    .map((args) => args.body);

const queueProvider = (...responses: unknown[]): void => {
  const queue = [...responses];
  httpRequest.mockImplementation(async (args: { url: string }) =>
    args.url.includes('/internal/connectors/config') ? connectorConfig : queue.shift(),
  );
};

const manualPayload = (provider: string, model: string): MessageRoutedData =>
  ({
    messageId: 'msg-1',
    threadId: 'thread-1',
    selectedProvider: provider,
    selectedModel: model,
    routingMode: 'MANUAL_MODEL',
  }) as MessageRoutedData;

describe('provider recovery at the chokepoint (ADR-125)', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;
  let limits: OutputLimits;

  beforeEach(() => {
    vi.clearAllMocks();
    delay.mockResolvedValue(undefined);
    ProviderCircuitBreakerManager.resetAll();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      ENABLE_GEMINI_FILES_API: false,
      ENABLE_ANTHROPIC_NATIVE_PDF: false,
    });
    access = createFakePaygAccessControl();
    limits = {
      find: vi.fn().mockResolvedValue(undefined),
      record: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe('output-limit refusals', () => {
    it('Groq: retries ONCE at the stated ceiling, remembers it, own PAYG hold', async () => {
      queueProvider(GROQ_OUTPUT_400, cloudOk);
      const response = await build(access, limits).callProvider(
        'GROQ',
        'qwen/qwen3.8-27b',
        makeContext(),
        Date.now(),
        false,
        undefined,
        undefined,
        { fastPathEnabled: false, applyShortResponseConstraint: false, maxOutputTokens: 32_768 },
        undefined,
        { requestId: 'req-1' },
      );
      expect(response.content).toBe('answer');
      expect(providerBodies().map((body) => body.max_tokens)).toEqual([32_768, 16_384]);
      expect(limits.record).toHaveBeenCalledWith('GROQ', 'qwen/qwen3.8-27b', 16_384);
      expect(access.reserveCredit).toHaveBeenCalledTimes(2);
      expect(access.reserveCredit.mock.calls[1]?.[0]).toMatchObject({
        requestId: `req-1${PROVIDER_RETRY_REQUEST_SUFFIX}`,
      });
      expect(access.releaseCredit).toHaveBeenCalledTimes(1);
    });

    it('a known ceiling pre-clamps: no failed call at all', async () => {
      limits.find.mockResolvedValue(16_384);
      queueProvider(cloudOk);
      await build(access, limits).callProvider(
        'GROQ',
        'qwen/qwen3.8-27b',
        makeContext(),
        Date.now(),
        false,
        undefined,
        undefined,
        { fastPathEnabled: false, applyShortResponseConstraint: false, maxOutputTokens: 32_768 },
      );
      expect(providerBodies().map((body) => body.max_tokens)).toEqual([16_384]);
      expect(access.reserveCredit.mock.calls[0]?.[0]).toMatchObject({
        requestedMaxOutputTokens: 16_384,
      });
    });

    it('never loops: a second output-limit refusal is thrown translated', async () => {
      queueProvider(GROQ_OUTPUT_400, GROQ_OUTPUT_400, cloudOk);
      await expect(
        build(access, limits).callProvider('GROQ', 'm', makeContext(), Date.now(), false),
      ).rejects.toBeInstanceOf(ProviderOutputLimitException);
      expect(providerBodies()).toHaveLength(2);
    });

    it('streaming (Ollama wording): retried once at the ceiling', async () => {
      queueProvider();
      httpStream
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          errorBody: JSON.stringify({
            error:
              "max_tokens (16384) exceeds model's maximum output tokens (8192) for model glm-5.3",
          }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, chunks: sseChunks() });
      const response = await build(access, limits, true).streamModelForLane(
        'OPENROUTER',
        'z-ai/glm-5.3',
        makeContext(),
        Date.now(),
        undefined,
        { threadId: 'thread-1', messageId: 'msg-1' },
      );
      expect(response.content).toBe('streamed answer');
      const bodies = httpStream.mock.calls.map(
        (call) => (call[0] as { body: { max_tokens?: number } }).body.max_tokens,
      );
      expect(bodies).toEqual([16_384, 8_192]);
      expect(limits.record).toHaveBeenCalledWith('OPENROUTER', 'z-ai/glm-5.3', 8_192);
    });
  });

  describe('transient rate limits', () => {
    it('OpenRouter :free 429: one short backoff, one retry', async () => {
      queueProvider({ ok: false, status: 429, data: OPENROUTER_FREE_429 }, cloudOk);
      const response = await build(access, limits).callProvider(
        'OPENROUTER',
        'z-ai/glm-5.2:free',
        makeContext(),
        Date.now(),
        false,
      );
      expect(response.content).toBe('answer');
      expect(delay).toHaveBeenCalledTimes(1);
      expect(providerBodies()).toHaveLength(2);
      expect(access.reserveCredit).toHaveBeenCalledTimes(2);
    });

    it('still limited after the retry: translated error, no URL, no loop', async () => {
      queueProvider(
        { ok: false, status: 429, data: OPENROUTER_FREE_429 },
        { ok: false, status: 429, data: OPENROUTER_FREE_429 },
        cloudOk,
      );
      const error = (await build(access, limits)
        .execute(manualPayload('OPENROUTER', 'z-ai/glm-5.2:free'), makeContext())
        .catch((caught: unknown) => caught)) as ProviderRateLimitedException;
      expect(error).toBeInstanceOf(ProviderRateLimitedException);
      expect(error.message).not.toMatch(/https?:\/\/|\{|metadata/u);
      expect(providerBodies()).toHaveLength(2);
    });
  });

  describe('account-level credit exhaustion + circuit breaker', () => {
    it('Anthropic low balance (manual): translated PROVIDER_CREDIT_EXHAUSTED, no retry', async () => {
      queueProvider(ANTHROPIC_LOW_BALANCE_400, cloudOk);
      const error = (await build(access, limits)
        .execute(manualPayload('ANTHROPIC', 'claude-opus-5-5'), makeContext())
        .catch((caught: unknown) => caught)) as Error & { code?: string; messageKey?: string };
      expect(error.code).toBe(PROVIDER_CREDIT_EXHAUSTED_CODE);
      expect(error.messageKey).toBe(PROVIDER_CREDIT_EXHAUSTED_MESSAGE_KEY);
      expect(error.message).not.toMatch(/https?:\/\/|\{/u);
      expect(providerBodies()).toHaveLength(1);
    });

    it('OpenAI no credits: AUTO moves on, then the breaker skips OpenAI with no call or hold', async () => {
      const auto = {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'OPENAI',
        selectedModel: 'gpt-5.6-sol',
        routingMode: 'AUTO',
        fallbackChain: [{ provider: 'GEMINI', model: 'gemini-3.5-flash' }],
      } as unknown as MessageRoutedData;
      queueProvider(OPENAI_NO_CREDITS_429, cloudOk, cloudOk);
      const manager = build(access, limits);

      const first = await manager.execute(auto, makeContext());
      expect(first.provider).toBe('GEMINI');
      expect(providerBodies()).toHaveLength(2);

      const reservesBefore = access.reserveCredit.mock.calls.length;
      const second = await manager.execute(auto, makeContext());
      expect(second.provider).toBe('GEMINI');
      // Only Gemini was dialled and held the second time.
      expect(providerBodies()).toHaveLength(3);
      expect(access.reserveCredit.mock.calls.length - reservesBefore).toBe(1);
    });
  });
});
