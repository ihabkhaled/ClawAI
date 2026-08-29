import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode, PaygSurface, TokenLedgerContext } from '@claw/shared-types';
import { PaygCreditExhaustedError } from '@claw/shared-entitlements';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import { StreamEventType } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import { PAYG_WORKFLOW_VISION_PROMPT } from '../constants/payg.constants';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

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
  AUTH_SERVICE_URL: 'http://auth:4001',
  ENABLE_GEMINI_FILES_API: false,
  ENABLE_ANTHROPIC_NATIVE_PDF: false,
};

const makeContext = (content: string, userId = 'user-1'): AssembledContext =>
  ({
    userId,
    systemPrompt: null,
    threadMessages: [{ id: 'm1', threadId: 'thread-1', role: 'USER', content }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

const cloudOk = (content = 'answer'): unknown => ({
  ok: true,
  status: 200,
  data: {
    choices: [{ message: { content }, finish_reason: 'stop' }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 40,
      prompt_tokens_details: { cached_tokens: 60 },
      completion_tokens_details: { reasoning_tokens: 25 },
    },
  },
});

describe('PAYG credit — the chat chokepoint', () => {
  let manager: ChatExecutionManager;
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;
  let streamService: Record<string, jest.Mock>;

  const build = (access: ReturnType<typeof createFakePaygAccessControl>): ChatExecutionManager => {
    streamService = {
      emitRouterStarted: jest.fn(),
      emitProviderSelected: jest.fn(),
      emitResponseStreaming: jest.fn(),
      startResponseProgressHeartbeat: jest.fn().mockReturnValue(jest.fn()),
      emitFallbackAttempt: jest.fn(),
      emitError: jest.fn(),
      emitProgressStage: jest.fn(),
    };
    return new ChatExecutionManager(
      {
        buildPromptString: jest.fn().mockReturnValue('a prompt of some length'),
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
      } as unknown as JudgeRefereeManager,
      streamService as unknown as ChatStreamService,
      {
        run: jest.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
          context: ctx,
          outcome: { applied: false, results: [], runId: null, warning: null },
        })),
      } as unknown as SearchFirstManager,
      access as unknown as AccessControlService,
      {
        uploadFile: jest.fn(),
        getCachedOrUpload: jest.fn(),
      } as unknown as GeminiFilesApiManager,
      {
        resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
        resolveModelList: jest.fn().mockResolvedValue(['qwen3:7b']),
      } as unknown as LocalModelSelectionService,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);
    accessControl = createFakePaygAccessControl();
    manager = build(accessControl);
    httpRequest.mockImplementation(async (args: { url: string }) => {
      if (args.url.includes('/internal/connectors/config')) {
        return {
          ok: true,
          status: 200,
          data: { baseUrl: 'https://api.openai.com/v1', apiKey: 'k' },
        };
      }
      return cloudOk();
    });
  });

  // ── surface CHAT ─────────────────────────────────────────────────────────
  it('reserves before the provider call and finalizes with the measured usage', async () => {
    const response = await manager.callProvider(
      'OPENAI',
      'gpt-5',
      makeContext('hello'),
      Date.now(),
      false,
    );

    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(1);
    const reserved = accessControl.reserveCredit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(reserved['userId']).toBe('user-1');
    expect(reserved['provider']).toBe('OPENAI');
    expect(reserved['surface']).toBe(PaygSurface.CHAT);
    expect(typeof reserved['requestId']).toBe('string');

    expect(accessControl.finalizeCredit).toHaveBeenCalledTimes(1);
    // The cached and reasoning splits are the whole point: finalizing them as
    // zero bills a reasoning model at nothing on its dominant cost.
    expect(accessControl.finalizeCredit.mock.calls[0]?.[1]).toEqual({
      promptTokens: 100,
      completionTokens: 40,
      cachedPromptTokens: 60,
      reasoningTokens: 25,
    });
    expect(accessControl.releaseCredit).not.toHaveBeenCalled();
    expect(response.content).toBe('answer');
  });

  it('releases the hold when the provider call throws', async () => {
    httpRequest.mockImplementation(async (args: { url: string }) => {
      if (args.url.includes('/internal/connectors/config')) {
        return {
          ok: true,
          status: 200,
          data: { baseUrl: 'https://api.openai.com/v1', apiKey: 'k' },
        };
      }
      throw new Error('socket hang up');
    });

    await expect(
      manager.callProvider('OPENAI', 'gpt-5', makeContext('hello'), Date.now(), false),
    ).rejects.toThrow('socket hang up');

    expect(accessControl.releaseCredit).toHaveBeenCalledTimes(1);
    expect(accessControl.releaseCredit.mock.calls[0]?.[1]).toBe('PROVIDER_ERROR');
    expect(accessControl.finalizeCredit).not.toHaveBeenCalled();
  });

  it('sends the provider the clamped ceiling, not the one it asked for', async () => {
    const clamped = createFakePaygAccessControl({ clamped: true, maxOutputTokens: 700 });
    manager = build(clamped);

    const response = await manager.callProvider(
      'OPENAI',
      'gpt-5',
      makeContext('hello'),
      Date.now(),
      false,
      undefined,
      undefined,
      { fastPathEnabled: false, applyShortResponseConstraint: false, maxOutputTokens: 8000 },
    );

    const providerCall = httpRequest.mock.calls.find(
      (call: [{ url: string }]) => !call[0].url.includes('/internal/connectors/config'),
    );
    const body = providerCall?.[0].body as { max_tokens?: number; max_completion_tokens?: number };
    expect(body.max_tokens ?? body.max_completion_tokens).toBe(700);
    // The user is told, rather than handed a quietly short answer.
    expect(response.paygClamped).toBe(true);
  });

  it('does not overwrite an unset ceiling when the hold took nothing away', async () => {
    await manager.callProvider('OPENAI', 'gpt-5', makeContext('hello'), Date.now(), false);
    const providerCall = httpRequest.mock.calls.find(
      (call: [{ url: string }]) => !call[0].url.includes('/internal/connectors/config'),
    );
    const body = providerCall?.[0].body as { max_tokens?: number };
    expect(body.max_tokens).toBeUndefined();
  });

  it('refuses an unattributable paid call and lets a local one through', async () => {
    await expect(
      manager.callProvider('OPENAI', 'gpt-5', makeContext('hi', ''), Date.now(), false),
    ).rejects.toMatchObject({
      code: BillingErrorCode.PAYG_PRICING_UNAVAILABLE,
      status: HttpStatus.PAYMENT_REQUIRED,
    });
    expect(accessControl.reserveCredit).not.toHaveBeenCalled();

    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { model: 'qwen3:1.7b', response: 'local answer', done: true },
    });
    await expect(
      manager.callProvider('local-ollama', 'qwen3:1.7b', makeContext('hi', ''), Date.now(), false),
    ).resolves.toMatchObject({ content: 'local answer' });
  });

  it('normalizes a local runtime tag to the connector provider auth knows', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { model: 'qwen3:1.7b', response: 'local', done: true },
    });
    await manager.callProvider('local-ollama', 'qwen3:1.7b', makeContext('hi'), Date.now(), false);
    expect(accessControl.reserveCredit.mock.calls[0]?.[0]).toMatchObject({ provider: 'OLLAMA' });
  });

  // ── surfaces derived from the ledger context ─────────────────────────────
  it.each([
    [TokenLedgerContext.JUDGE, PaygSurface.JUDGE],
    [TokenLedgerContext.COMPARE, PaygSurface.COMPARE],
    [TokenLedgerContext.CONSENSUS, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.ESCALATION_CHAIN, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.BEST_OF_N, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.COST_ENSEMBLE, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.ROLE_PACK, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.PIPELINE, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.TASK_DECOMPOSITION, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.VERIFY, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.REPAIR, PaygSurface.ORCHESTRATION],
    [TokenLedgerContext.FILE_GENERATION, PaygSurface.FILE_GENERATION],
  ])('bills %s to the %s surface', async (ledger, surface) => {
    await manager.callProvider(
      'OPENAI',
      'gpt-5',
      makeContext('hello'),
      Date.now(),
      false,
      undefined,
      undefined,
      undefined,
      ledger,
    );
    expect(accessControl.reserveCredit.mock.calls[0]?.[0]).toMatchObject({
      surface,
      workflow: String(ledger).toLowerCase(),
    });
  });

  // ── delegated generation providers ───────────────────────────────────────
  it('does not double-reserve for a provider that meters itself downstream', async () => {
    httpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { generationId: 'gen-1' },
    });
    await manager.callProvider(
      'IMAGE_OPENAI',
      'gpt-image-1',
      makeContext('a cat'),
      Date.now(),
      false,
    );
    expect(accessControl.reserveCredit).not.toHaveBeenCalled();
  });

  // ── surface IMAGE, via the vision prompt hop (U2) ────────────────────────
  it('meters the vision prompt hop that used to dial Gemini directly', async () => {
    const context = {
      ...makeContext('make it like this'),
      fileContents: [{ id: 'f1', filename: 'a.png', mimeType: 'image/png', content: 'YmFzZTY0' }],
    } as unknown as AssembledContext;
    httpRequest.mockImplementation(async (args: { url: string }) => {
      if (args.url.includes('/internal/connectors/config')) {
        return { ok: true, status: 200, data: { baseUrl: 'https://gemini/v1beta', apiKey: 'k' } };
      }
      if (args.url.includes('image')) {
        return { ok: true, status: 200, data: { generationId: 'gen-1' } };
      }
      return cloudOk('A serene mountain landscape, photorealistic, highly detailed.');
    });

    await manager.callProvider(
      'IMAGE_GEMINI',
      'gemini-2.5-flash-image',
      context,
      Date.now(),
      false,
    );

    const visionReserve = accessControl.reserveCredit.mock.calls.find(
      (call: [Record<string, unknown>]) => call[0]['workflow'] === PAYG_WORKFLOW_VISION_PROMPT,
    );
    expect(visionReserve).toBeDefined();
    expect(visionReserve?.[0]).toMatchObject({ surface: PaygSurface.IMAGE });
  });

  // ── the 402 boundary ─────────────────────────────────────────────────────
  it('surfaces a credit refusal as a 402 rather than swallowing it into a 500', async () => {
    // The real AccessControlService maps PaygCreditExhaustedError to a 402
    // BusinessException before any manager sees it; the double raises what is
    // already mapped, which is what every call site actually handles.
    const refused = createFakePaygAccessControl();
    refused.reserveCredit.mockRejectedValue(
      new BusinessException(
        'Your pay-as-you-go credit is used up.',
        BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
        HttpStatus.PAYMENT_REQUIRED,
      ),
    );
    manager = build(refused);

    await expect(
      manager.callProvider('OPENAI', 'gpt-5', makeContext('hello'), Date.now(), false),
    ).rejects.toMatchObject({ code: BillingErrorCode.PAYG_CREDIT_EXHAUSTED });
    // Nothing was sent to the provider.
    const providerCalls = httpRequest.mock.calls.filter(
      (call: [{ url: string }]) => !call[0].url.includes('/internal/connectors/config'),
    );
    expect(providerCalls).toHaveLength(0);
  });

  it('the shared error carries the code the frontend maps, never a provider rate', () => {
    const error = new PaygCreditExhaustedError(
      BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      1200,
      50_000,
    );
    expect(error.errorCode).toBe(BillingErrorCode.PAYG_CREDIT_EXHAUSTED);
    expect(error.availableMicroUsd).toBe(1200);
    expect(JSON.stringify(error)).not.toContain('rate');
  });

  // ── clamped notice on the stream ─────────────────────────────────────────
  it('tells the thread when the answer was shortened to fit the balance', async () => {
    const clamped = createFakePaygAccessControl({ clamped: true, maxOutputTokens: 512 });
    manager = build(clamped);
    await manager.callProvider(
      'OPENAI',
      'gpt-5',
      makeContext('hello'),
      Date.now(),
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      { threadId: 'thread-1' },
    );
    expect(streamService['emitProgressStage']).toHaveBeenCalledWith(
      'thread-1',
      StreamEventType.PAYG_CREDIT_CLAMPED,
      expect.objectContaining({ stageId: 'payg:clamped' }),
    );
  });
});
