import { HttpStatus } from '@nestjs/common';
import { type Mock, vi } from 'vitest';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ProviderCircuitBreakerManager } from '../managers/provider-circuit-breaker.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { AssembledContext } from '../types/context.types';
import type { MessageRoutedData } from '../types/execution.types';
import { BusinessException, PickedModelFailedException } from '../../../common/errors';
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
vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  httpStream: vi.fn(),
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-token'),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined =>
    !record ? undefined : (Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined),
}));

const { httpRequest } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
};
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const PROVIDER_DOWN = { ok: false, status: 503, data: { error: { message: 'overloaded' } } };
const MODEL_NOT_FOUND = { ok: false, status: 404, data: { error: { message: 'model not found' } } };
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

function build(access: ReturnType<typeof createFakePaygAccessControl>): ChatExecutionManager {
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
    new Proxy(
      {},
      {
        get: (_target, property) =>
          property === 'startResponseProgressHeartbeat' ? () => () => {} : vi.fn(),
      },
    ) as unknown as ChatStreamService,
    {
      run: vi.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
        context: ctx,
        outcome: { applied: false, results: [], runId: null, warning: null },
      })),
    } as unknown as SearchFirstManager,
    access as unknown as AccessControlService,
    { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as unknown as GeminiFilesApiManager,
  );
}

const queueProvider = (...responses: unknown[]): void => {
  const queue = [...responses];
  httpRequest.mockImplementation(async (args: { url: string }) =>
    args.url.includes('/internal/connectors/config') ? connectorConfig : queue.shift(),
  );
};

const providerCalls = (): number =>
  httpRequest.mock.calls.filter(
    (call) => !(call[0] as { url: string }).url.includes('/internal/connectors/config'),
  ).length;

const SUBSTITUTES = [
  { provider: 'GROQ', model: 'llama-4', sameProvider: false, costlier: false },
  { provider: 'OPENAI', model: 'gpt-5.6-sol', sameProvider: false, costlier: true },
  { provider: 'GEMINI', model: 'gemini-3.6-flash', sameProvider: false, costlier: false },
  { provider: 'MISTRAL', model: 'mistral-large', sameProvider: false, costlier: false },
  { provider: 'DEEPSEEK', model: 'deepseek-v4', sameProvider: false, costlier: false },
];

const pickedPayload = (substitutes = SUBSTITUTES): MessageRoutedData =>
  ({
    messageId: 'msg-1',
    threadId: 'thread-1',
    selectedProvider: 'ANTHROPIC',
    selectedModel: 'claude-opus-5',
    routingMode: 'MANUAL_MODEL',
    pickedModelSubstitutes: substitutes,
  }) as unknown as MessageRoutedData;

describe('picked-model smart fallback at the chokepoint', () => {
  let access: ReturnType<typeof createFakePaygAccessControl>;

  beforeEach(() => {
    vi.clearAllMocks();
    ProviderCircuitBreakerManager.resetAll();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      ENABLE_GEMINI_FILES_API: false,
      ENABLE_ANTHROPIC_NATIVE_PDF: false,
    });
    access = createFakePaygAccessControl();
  });

  it('answers with the first substitute when the pick fails, and says who failed', async () => {
    queueProvider(PROVIDER_DOWN, cloudOk);
    const response = await build(access).execute(pickedPayload(), makeContext());
    expect(response.provider).toBe('GROQ');
    expect(response.model).toBe('llama-4');
    expect(response.pickedModelFallback).toEqual({
      originalProvider: 'ANTHROPIC',
      originalModel: 'claude-opus-5',
      costlier: false,
    });
    expect(providerCalls()).toBe(2);
  });

  it('flags a pricier substitute as costlier', async () => {
    queueProvider(
      PROVIDER_DOWN,
      PROVIDER_DOWN,
      cloudOk,
    );
    const response = await build(access).execute(
      pickedPayload([SUBSTITUTES[0], SUBSTITUTES[1]].filter((s) => s !== undefined)),
      makeContext(),
    );
    expect(response.provider).toBe('OPENAI');
    expect(response.pickedModelFallback?.costlier).toBe(true);
  });

  it('tries at most two substitutes, then offers three untried models', async () => {
    queueProvider(PROVIDER_DOWN, PROVIDER_DOWN, PROVIDER_DOWN, cloudOk);
    const error = (await build(access)
      .execute(pickedPayload(), makeContext())
      .catch((caught: unknown) => caught)) as PickedModelFailedException;
    expect(error).toBeInstanceOf(PickedModelFailedException);
    expect(providerCalls()).toBe(3);
    expect(error.failedModel).toBe('claude-opus-5');
    expect(error.suggestedModels).toEqual([
      { provider: 'GEMINI', model: 'gemini-3.6-flash' },
      { provider: 'MISTRAL', model: 'mistral-large' },
      { provider: 'DEEPSEEK', model: 'deepseek-v4' },
    ]);
    expect(error.message).not.toMatch(/https?:\/\/|\{/u);
  });

  it('skips a second model of a provider that failed as a whole', async () => {
    queueProvider(PROVIDER_DOWN, cloudOk);
    const response = await build(access).execute(
      pickedPayload([
        { provider: 'ANTHROPIC', model: 'claude-sonnet-5', sameProvider: true, costlier: false },
        SUBSTITUTES[0] as (typeof SUBSTITUTES)[number],
      ]),
      makeContext(),
    );
    // Anthropic was down: the Anthropic substitute is never dialled.
    expect(response.provider).toBe('GROQ');
    expect(providerCalls()).toBe(2);
  });

  it('still tries the same provider after a model-level failure (404)', async () => {
    queueProvider(MODEL_NOT_FOUND, cloudOk);
    const response = await build(access).execute(
      pickedPayload([
        { provider: 'ANTHROPIC', model: 'claude-sonnet-5', sameProvider: true, costlier: false },
      ]),
      makeContext(),
    );
    expect(response.provider).toBe('ANTHROPIC');
    expect(response.model).toBe('claude-sonnet-5');
    expect(response.pickedModelFallback?.originalModel).toBe('claude-opus-5');
  });

  it('never falls back after a credit refusal (402): the refusal reaches the user', async () => {
    const refusal = new BusinessException(
      'Not enough credit',
      'PAYG_CREDIT_EXHAUSTED',
      HttpStatus.PAYMENT_REQUIRED,
    );
    access = createFakePaygAccessControl({ refuseWith: refusal });
    queueProvider(cloudOk, cloudOk);
    const error = await build(access)
      .execute(pickedPayload(), makeContext())
      .catch((caught: unknown) => caught);
    expect(error).toBe(refusal);
    expect(providerCalls()).toBe(0);
    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
  });

  it('never falls back after a plan refusal (403)', async () => {
    const refusal = new BusinessException(
      'Plan does not include this model',
      'MODEL_NOT_ALLOWED',
      HttpStatus.FORBIDDEN,
    );
    access = createFakePaygAccessControl({ refuseWith: refusal });
    queueProvider(cloudOk);
    const error = await build(access)
      .execute(pickedPayload(), makeContext())
      .catch((caught: unknown) => caught);
    expect(error).toBe(refusal);
    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
  });

  it('keeps the old single-candidate behaviour when routing named no substitutes', async () => {
    queueProvider(PROVIDER_DOWN, cloudOk);
    const error = await build(access)
      .execute(pickedPayload([]), makeContext())
      .catch((caught: unknown) => caught);
    expect(error).not.toBeInstanceOf(PickedModelFailedException);
    expect(providerCalls()).toBe(1);
  });
});
