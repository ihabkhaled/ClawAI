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
import { BusinessException } from '../../../common/errors';
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
const cloudOk = {
  ok: true,
  status: 200,
  data: {
    choices: [{ message: { content: 'answer' }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  },
};
// OLLAMA (an included provider) answers in the native Ollama chat shape.
const ollamaOk = {
  ok: true,
  status: 200,
  data: {
    message: { content: 'answer' },
    done: true,
    done_reason: 'stop',
    prompt_eval_count: 10,
    eval_count: 5,
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

type Mode = 'FALLBACK' | 'STOP' | undefined;

const withMode = (
  access: ReturnType<typeof createFakePaygAccessControl>,
  mode: Mode | 'THROWS',
) => {
  const modeFor = vi.fn(async () => {
    if (mode === 'THROWS') {
      throw new Error('entitlements down');
    }
    return mode;
  });
  (access as unknown as { creditFallbackModeFor: Mock }).creditFallbackModeFor = modeFor;
  return modeFor;
};

const INCLUDED = {
  provider: 'OLLAMA',
  model: 'gpt-oss:120b',
  sameProvider: false,
  costlier: false,
};
const METERED = ['ANTHROPIC', 'GROQ', 'OPENAI', 'GEMINI', 'MISTRAL', 'DEEPSEEK'];
const refuse = (code: string) =>
  new BusinessException('Not enough credit', code, HttpStatus.PAYMENT_REQUIRED);

describe('per-user credit fallback mode (ADR-161)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProviderCircuitBreakerManager.resetAll();
    appConfigGet.mockReturnValue({
      CONNECTOR_SERVICE_URL: 'http://connector:4011',
      OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
      ENABLE_GEMINI_FILES_API: false,
      ENABLE_ANTHROPIC_NATIVE_PDF: false,
    });
  });

  it.each<[string, Mode]>([
    ['FALLBACK', 'FALLBACK'],
    ['absent', undefined],
  ])('%s: an included model answers with the notice, as before', async (_name, mode) => {
    const access = createFakePaygAccessControl({
      refuseWith: refuse('PAYG_CREDIT_EXHAUSTED'),
      refuseProviders: METERED,
    });
    withMode(access, mode);
    queueProvider(ollamaOk);
    const response = await build(access).execute(
      pickedPayload([...SUBSTITUTES, INCLUDED]),
      makeContext(),
    );
    expect(response.provider).toBe('OLLAMA');
    expect(response.creditFallback).toEqual({
      originalProvider: 'ANTHROPIC',
      originalModel: 'claude-opus-5',
      reason: 'CREDIT_EXHAUSTED',
    });
    expect(
      access.reserveCredit.mock.calls.map((call) => (call[0] as { provider: string }).provider),
    ).toEqual(['ANTHROPIC', 'OLLAMA']);
  });

  it('a send that never meets a credit refusal never reads the mode', async () => {
    const access = createFakePaygAccessControl();
    const modeFor = withMode(access, 'STOP');
    queueProvider(cloudOk);
    const response = await build(access).execute(pickedPayload(), makeContext());
    expect(response.provider).toBe('ANTHROPIC');
    expect(modeFor).not.toHaveBeenCalled();
  });

  it('STOP: the turn ends with the original credit refusal and no substitute is dialled', async () => {
    const refusal = refuse('PAYG_CREDIT_EXHAUSTED');
    const access = createFakePaygAccessControl({ refuseWith: refusal, refuseProviders: METERED });
    withMode(access, 'STOP');
    queueProvider(ollamaOk);
    const error = await build(access)
      .execute(pickedPayload([...SUBSTITUTES, INCLUDED]), makeContext())
      .catch((caught: unknown) => caught);
    expect(error).toBe(refusal);
    expect((error as BusinessException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
    expect(providerCalls()).toBe(0);
    expect(access.reserveCredit).toHaveBeenCalledTimes(1);
  });

  it.each([
    'PAYG_FREE_ALLOWANCE_EXHAUSTED',
    'PAYG_PROMPT_TOO_EXPENSIVE',
    'PAYG_MODEL_NOT_IN_FREE_ALLOWANCE',
  ])('STOP: %s also stops instead of trying a cheaper or included model', async (code) => {
    const refusal = refuse(code);
    const access = createFakePaygAccessControl({
      refuseWith: refusal,
      refuseProviders: ['ANTHROPIC'],
    });
    withMode(access, 'STOP');
    queueProvider(cloudOk);
    const error = await build(access)
      .execute(pickedPayload([...SUBSTITUTES, INCLUDED]), makeContext())
      .catch((caught: unknown) => caught);
    expect(error).toBe(refusal);
    expect(providerCalls()).toBe(0);
  });

  it('STOP: a provider outage (not a credit refusal) still falls to a substitute', async () => {
    const access = createFakePaygAccessControl();
    const modeFor = withMode(access, 'STOP');
    queueProvider(PROVIDER_DOWN, cloudOk);
    const response = await build(access).execute(pickedPayload(), makeContext());
    expect(response.provider).toBe('GROQ');
    expect(response.creditFallback).toBeUndefined();
    expect(modeFor).not.toHaveBeenCalled();
  });

  it('STOP: a mixed chain stops at the first refusal though a later metered model is affordable', async () => {
    const refusal = refuse('PAYG_CREDIT_EXHAUSTED');
    const access = createFakePaygAccessControl({
      refuseWith: refusal,
      refuseProviders: ['ANTHROPIC'],
    });
    withMode(access, 'STOP');
    queueProvider(cloudOk);
    const error = await build(access)
      .execute(pickedPayload(), makeContext())
      .catch((caught: unknown) => caught);
    expect(error).toBe(refusal);
    expect(providerCalls()).toBe(0);
  });

  it('an unreadable mode keeps the fallback behaviour', async () => {
    const access = createFakePaygAccessControl({
      refuseWith: refuse('PAYG_CREDIT_EXHAUSTED'),
      refuseProviders: METERED,
    });
    withMode(access, 'THROWS');
    queueProvider(ollamaOk);
    const response = await build(access).execute(
      pickedPayload([...SUBSTITUTES, INCLUDED]),
      makeContext(),
    );
    expect(response.provider).toBe('OLLAMA');
    expect(response.creditFallback?.reason).toBe('CREDIT_EXHAUSTED');
  });
});
