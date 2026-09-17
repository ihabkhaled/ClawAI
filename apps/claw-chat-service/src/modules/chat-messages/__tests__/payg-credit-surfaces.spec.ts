import { type Mock, vi } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { BillingErrorCode, PaygSurface } from '@claw/shared-types';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ParallelExecutionManager } from '../managers/parallel-execution.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { ResearchEnricherManager } from '../managers/research-enricher.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { FileDeliveryRecordService } from '../services/file-delivery-record.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import type { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import type { AssembledContext } from '../types/context.types';
import { BusinessException } from '../../../common/errors';
import {
  PAYG_COMPARE_ALL_OR_NOTHING_CODE,
  PAYG_WORKFLOW_TOOL_LOOP,
} from '../constants/payg.constants';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return {
      isExposed: vi.fn().mockResolvedValue(true),
    };
  }),
}));
vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined => {
    if (!record) return undefined;
    return Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined;
  },
  buildFileDeliveryEntries: vi.fn().mockReturnValue([]),
}));

const { httpRequest } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
};
// AppConfig exposes a STATIC get(); neither a bare automock nor importMock
// hands that same static back, so the spec configured one object while the code
// under test read another. A hoisted vi.fn keeps both on one mock.
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const AppConfig = { get: appConfigGet };

const DEFAULT_APP_CONFIG = {
  OLLAMA_SERVICE_URL: 'http://ollama:4008',
  OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
  CONNECTOR_SERVICE_URL: 'http://connector:4011',
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 50,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
  AUTH_SERVICE_URL: 'http://auth:4001',
  ENABLE_GEMINI_FILES_API: false,
};

const makeContext = (): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'm1', threadId: 'thread-1', role: 'USER', content: 'question' }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

const toolTurn = (content: string, withToolCall: boolean): unknown => ({
  ok: true,
  status: 200,
  data: {
    model: 'deepseek-v4-pro',
    message: withToolCall
      ? {
          role: 'assistant',
          content,
          tool_calls: [{ function: { name: 'web_search', arguments: { query: 'x' } } }],
        }
      : { role: 'assistant', content },
    done: true,
    done_reason: 'stop',
    prompt_eval_count: 20,
    eval_count: 8,
  },
});

const buildExecution = (
  access: ReturnType<typeof createFakePaygAccessControl>,
): ChatExecutionManager =>
  new ChatExecutionManager(
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
    access as unknown as AccessControlService,
    { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as unknown as GeminiFilesApiManager,
    {
      resolveDefaultModel: vi.fn().mockResolvedValue('qwen3:1.7b'),
      resolveModelList: vi.fn().mockResolvedValue(['qwen3:7b']),
    } as unknown as LocalModelSelectionService,
  );

describe('PAYG credit — the Ollama Cloud tool loop bills every turn', () => {
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;
  let manager: ChatExecutionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);
    accessControl = createFakePaygAccessControl();
    manager = buildExecution(accessControl);
  });

  it('takes one hold per turn, not one for the whole run', async () => {
    // turn 1 wants a tool, the tool answers, turn 2 finishes. Two paid
    // completions, so two holds - billing this as one was the U11 finding.
    httpRequest
      .mockResolvedValueOnce(toolTurn('let me look that up', true))
      .mockResolvedValueOnce({ ok: true, status: 200, data: { results: [{ title: 't' }] } })
      .mockResolvedValueOnce(toolTurn('React 19 is the latest release.', false));

    const result = await manager.runOllamaCloudToolLoop({
      provider: 'OLLAMA',
      model: 'deepseek-v4-pro',
      initialBody: {
        model: 'deepseek-v4-pro',
        messages: [{ role: 'user', content: 'what is the latest react version?' }],
        stream: false,
      },
      baseUrl: 'https://ollama.com/api',
      apiKey: 'k',
      startTime: Date.now(),
      usedFallback: false,
      context: makeContext(),
    });

    expect(result.content).toBe('React 19 is the latest release.');
    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(2);
    expect(accessControl.finalizeCredit).toHaveBeenCalledTimes(2);

    const ids = accessControl.reserveCredit.mock.calls.map(
      (call) => call[0]['requestId'],
    );
    // Distinct ids, or the second turn would reuse the first turn's hold and
    // the run would be billed once however long it ran.
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toContain(':turn:1');
    expect(ids[1]).toContain(':turn:2');
    expect(accessControl.reserveCredit.mock.calls[0]?.[0]).toMatchObject({
      workflow: PAYG_WORKFLOW_TOOL_LOOP,
    });
  });

  it('releases the turn hold when that turn fails', async () => {
    httpRequest.mockResolvedValueOnce({ ok: false, status: 502, data: { message: 'bad gateway' } });

    await expect(
      manager.runOllamaCloudToolLoop({
        provider: 'OLLAMA',
        model: 'deepseek-v4-pro',
        initialBody: { model: 'deepseek-v4-pro', messages: [], stream: false },
        baseUrl: 'https://ollama.com/api',
        apiKey: 'k',
        startTime: Date.now(),
        usedFallback: false,
        context: makeContext(),
      }),
    ).rejects.toBeDefined();

    expect(accessControl.releaseCredit).toHaveBeenCalledTimes(1);
    expect(accessControl.finalizeCredit).not.toHaveBeenCalled();
  });
});

describe('PAYG credit — compare is all-or-nothing (E2)', () => {
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;
  let execution: ChatExecutionManager;
  let parallel: ParallelExecutionManager;

  const models = [
    { provider: 'OPENAI', model: 'gpt-5' },
    { provider: 'ANTHROPIC', model: 'claude-sonnet-4' },
    { provider: 'GEMINI', model: 'gemini-2.5-pro' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);
    accessControl = createFakePaygAccessControl();
    execution = buildExecution(accessControl);
    parallel = new ParallelExecutionManager(
      execution,
      {
        assemble: vi.fn().mockResolvedValue(makeContext()),
      } as unknown as ContextAssemblyManager,
      { shouldActivate: vi.fn().mockReturnValue(false) } as unknown as JudgeRefereeManager,
      {
        create: vi.fn().mockResolvedValue({ id: 'msg-1', threadId: 'thread-1' }),
        findRecentByThreadId: vi.fn().mockResolvedValue([]),
      } as unknown as ChatMessagesRepository,
      {
        findById: vi.fn().mockResolvedValue({ id: 'thread-1' }),
      } as unknown as ChatThreadsRepository,
      {
        emitRequestAccepted: vi.fn(),
        emitProgressStage: vi.fn(),
        emitCompletion: vi.fn(),
        emitError: vi.fn(),
      } as unknown as ChatStreamService,
      { enrich: vi.fn() } as unknown as ResearchEnricherManager,
      { recordMany: vi.fn() } as unknown as FileDeliveryRecordService,
    );
  });

  it('reserves every lane before any provider is called', async () => {
    const holds = await Promise.all(
      models.map((target, index) =>
        execution.reserveCompareLane({
          provider: target.provider,
          model: target.model,
          context: makeContext(),
          requestId: `group:lane:${String(index)}`,
        }),
      ),
    );
    expect(holds).toHaveLength(3);
    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(3);
    for (const call of accessControl.reserveCredit.mock.calls) {
      expect(call[0]).toMatchObject({ surface: PaygSurface.COMPARE });
    }
    // No provider was dialled while the lanes were being funded.
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('refuses the whole run and gives back every hold already taken', async () => {
    let calls = 0;
    accessControl.reserveCredit.mockImplementation(async () => {
      calls += 1;
      if (calls === 3) {
        throw new BusinessException(
          'no credit',
          BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      return accessControl.hold;
    });

    // Reaches reserveAllLanes through the public background path; the manager
    // catches, stores a failed row and emits, so the assertion is on the meter.
    await parallel.executeParallel(
      'user-1',
      'thread-1',
      'compare these',
      models,
      { enabled: false, model: null },
      { enabled: false, model: null },
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(3);
    // The two lanes that WERE funded are handed straight back: a comparison
    // that cannot run in full must not leave the user paying for a fragment.
    expect(accessControl.releaseCredit).toHaveBeenCalledTimes(2);
    expect(httpRequest).not.toHaveBeenCalled();
  });

  it('names the shortfall instead of repeating the raw credit error', async () => {
    const refusal = new BusinessException(
      'no credit',
      BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
      HttpStatus.PAYMENT_REQUIRED,
    );
    accessControl.reserveCredit.mockRejectedValue(refusal);

    const reserveAllLanes = (
      parallel as unknown as {
        reserveAllLanes: (m: typeof models, c: AssembledContext, g: string) => Promise<unknown>;
      }
    ).reserveAllLanes.bind(parallel);

    await expect(reserveAllLanes(models, makeContext(), 'group-1')).rejects.toMatchObject({
      code: PAYG_COMPARE_ALL_OR_NOTHING_CODE,
      status: HttpStatus.PAYMENT_REQUIRED,
    });
  });
});
