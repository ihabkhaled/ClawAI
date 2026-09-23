import { type Mock, vi } from 'vitest';
import { PaygSurface } from '@claw/shared-types';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { CompareJudgeManager } from '../managers/compare-judge.manager';
import { ModeExecutionGatewayManager } from '../managers/mode-execution-gateway.manager';
import type { ChatContextGatewayManager } from '../managers/chat-context-gateway.manager';
import type { ContextAssemblyManager } from '../managers/context-assembly.manager';
import type { GeminiFilesApiManager } from '../managers/gemini-files-api.manager';
import type { JudgeRefereeManager } from '../managers/judge-referee.manager';
import type { QualityCheckManager } from '../managers/quality-check.manager';
import type { SearchFirstManager } from '../managers/search-first.manager';
import type { AccessControlService } from '../services/access-control.service';
import type { ChatStreamService } from '../services/chat-stream.service';
import type { LocalModelSelectionService } from '../services/local-model-selection.service';
import type { AssembledContext } from '../types/context.types';
import { CompareJudgeVerdictStatus } from '../../../common/enums';
import { PAYG_WORKFLOW_COMPARE_JUDGE } from '../constants/payg.constants';
import {
  disabledCrossThreadResult,
  emptyConversationManifest,
  fallbackModelTokenBudget,
} from '../utilities/assembled-context.utility';
import { createFakePaygAccessControl } from './helpers/fake-payg-access-control.helper';

// ADR-116 — the comparative judge must cost exactly ONE metered call per
// compare run, through the real chat chokepoint. This suite runs the real
// ChatExecutionManager.callProvider against the shared PAYG double, so the
// assertion is on the meter, not on a mock of the manager.

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
  }),
}));
vi.mock('../../../common/utilities', () => ({
  httpRequest: vi.fn(),
  recordGet: <T>(record: Record<string, T> | undefined | null, key: string): T | undefined =>
    !record ? undefined : (Object.entries(record).find(([k]) => k === key)?.[1] as T | undefined),
}));

const { httpRequest } = (await vi.importMock('../../../common/utilities')) as {
  httpRequest: Mock;
};
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

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
};

const context = (): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'm1', threadId: 'thread-1', role: 'USER', content: 'question' }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRunId: null,
    researchWarnings: [],
    researchRequested: false,
    researchToolsUsed: [],
    tokenBudget: 4096,
    modelBudget: { ...fallbackModelTokenBudget(), contextWindowTokens: 128_000 },
    conversationManifest: emptyConversationManifest(),
    crossThread: disabledCrossThreadResult(),
  }) as unknown as AssembledContext;

const verdictBody = JSON.stringify({
  ranking: ['B', 'A', 'C'],
  scores: [
    { label: 'A', score: 6, reason: 'ok' },
    { label: 'B', score: 8, reason: 'best' },
    { label: 'C', score: 3, reason: 'weak' },
  ],
  rationale: 'B is the most complete.',
});

const buildExecution = (access: ReturnType<typeof createFakePaygAccessControl>): ChatExecutionManager =>
  new ChatExecutionManager(
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

describe('Compare judge billing — one metered judge call per run (ADR-116)', () => {
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;
  let judge: CompareJudgeManager;

  const run = (runId: string): Promise<unknown> =>
    judge.judge({
      userId: 'user-1',
      threadId: 'thread-1',
      runId,
      judgeModel: 'OPENAI:gpt-5-mini',
      critic: { enabled: false, model: null },
      instructions: null,
      laneContext: context(),
      lanes: [
        { laneIndex: 0, provider: 'ANTHROPIC', model: 'claude-sonnet-4', content: 'one' },
        { laneIndex: 1, provider: 'GEMINI', model: 'gemini-2.5-pro', content: 'two' },
        { laneIndex: 2, provider: 'DEEPSEEK', model: 'deepseek-chat', content: 'three' },
      ],
    });

  beforeEach(() => {
    vi.clearAllMocks();
    appConfigGet.mockReturnValue(APP_CONFIG);
    accessControl = createFakePaygAccessControl();
    httpRequest.mockImplementation(async (args: { url: string }) =>
      args.url.includes('/internal/connectors/config')
        ? { ok: true, status: 200, data: { baseUrl: 'https://api.openai.com/v1', apiKey: 'k' } }
        : {
            ok: true,
            status: 200,
            data: {
              choices: [{ message: { content: verdictBody }, finish_reason: 'stop' }],
              usage: { prompt_tokens: 800, completion_tokens: 90 },
            },
          },
    );
    judge = new CompareJudgeManager(
      {
        build: vi.fn().mockResolvedValue({
          context: context(),
          thread: null,
          threadSettings: { maxTokens: 1_500 },
          messages: [],
          fileIds: [],
          latestUserMetadata: null,
        }),
      } as unknown as ChatContextGatewayManager,
      new ModeExecutionGatewayManager(buildExecution(accessControl)),
      {
        resolveJudgeTarget: vi.fn().mockResolvedValue({ provider: 'OPENAI', model: 'gpt-5-mini' }),
        critiqueLane: vi.fn(),
      } as unknown as JudgeRefereeManager,
      { emitJudgeEvaluating: vi.fn(), emitOrchestrationStage: vi.fn() } as unknown as ChatStreamService,
    );
  });

  it('reserves once, as the JUDGE surface and the compare-judge workflow, and settles once', async () => {
    const verdict = (await run('run-9')) as { status: string };

    expect(verdict.status).toBe(CompareJudgeVerdictStatus.RANKED);
    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(1);
    expect(accessControl.reserveCredit.mock.calls[0]?.[0]).toMatchObject({
      userId: 'user-1',
      provider: 'OPENAI',
      model: 'gpt-5-mini',
      surface: PaygSurface.JUDGE,
      workflow: PAYG_WORKFLOW_COMPARE_JUDGE,
      requestId: `run-9:${PAYG_WORKFLOW_COMPARE_JUDGE}`,
    });
    expect(accessControl.finalizeCredit).toHaveBeenCalledTimes(1);
    expect(accessControl.releaseCredit).not.toHaveBeenCalled();
  });

  it('releases the one hold when the judge call fails, and reports unavailable', async () => {
    httpRequest.mockImplementation(async (args: { url: string }) => {
      if (args.url.includes('/internal/connectors/config')) {
        return { ok: true, status: 200, data: { baseUrl: 'https://api.openai.com/v1', apiKey: 'k' } };
      }
      throw new Error('socket hang up');
    });

    const verdict = (await run('run-10')) as { status: string; winnerLaneIndex: number | null };

    expect(verdict.status).toBe(CompareJudgeVerdictStatus.UNAVAILABLE);
    expect(verdict.winnerLaneIndex).toBeNull();
    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(1);
    expect(accessControl.releaseCredit).toHaveBeenCalledTimes(1);
  });
});
