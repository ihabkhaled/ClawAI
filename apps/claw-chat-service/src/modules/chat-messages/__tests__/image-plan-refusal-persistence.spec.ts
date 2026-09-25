// ADR-122, end to end inside chat-service: a routed image turn on a plan
// without `allowImageGeneration` runs through the REAL ChatExecutionManager and
// the REAL ChatMessagesService, and what lands in the transcript is a finished
// assistant message carrying the plan refusal — not an error row, not a
// pending generation card — with no image-service call and no PAYG hold.
import { type Mock, vi } from 'vitest';

import { ChatExecutionManager } from '../managers/chat-execution.manager';
import { ChatMessagesService } from '../services/chat-messages.service';
import {
  IMAGE_GENERATION_PLAN_REFUSAL_TEXT,
  PLAN_FEATURE_REFUSAL_METADATA_TYPE,
} from '../constants/plan-feature-refusal.constants';
import {
  asAccessControlService,
  createFakePaygAccessControl,
  type FakePaygAccessControl,
} from './helpers/fake-payg-access-control.helper';

vi.mock('../clients/model-exposure.client', () => ({
  ModelExposureClient: vi.fn(function () {
    return { isExposed: vi.fn().mockResolvedValue(true) };
  }),
}));

// Only the transport is replaced; every other shared utility stays real so the
// service under test runs its own code.
const { httpRequest } = vi.hoisted(() => ({ httpRequest: vi.fn() }));
vi.mock('../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  httpRequest,
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-token'),
}));

const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const APP_CONFIG = {
  IMAGE_SERVICE_URL: 'http://image-service:4012',
  OLLAMA_SERVICE_URL: 'http://ollama:4008',
  OLLAMA_GENERATE_TIMEOUT_MS: 10_000,
  CONNECTOR_SERVICE_URL: 'http://connector:4011',
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 50,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
};

const USER_MESSAGE = {
  id: 'msg-1',
  threadId: 'thread-1',
  role: 'USER' as const,
  content: 'draw a lighthouse at dusk',
  provider: null,
  model: null,
  routingMode: 'MANUAL_MODEL',
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  estimatedCost: null,
  latencyMs: null,
  feedback: null,
  metadata: null,
  createdAt: new Date(),
};

const THREAD = {
  id: 'thread-1',
  userId: 'user-1',
  title: 'Pictures',
  routingMode: 'MANUAL_MODEL' as const,
  preferredProvider: null,
  preferredModel: null,
  systemPrompt: null,
  temperature: 0.7,
  maxTokens: null,
  contextPackIds: null,
};

const ROUTED = {
  messageId: 'msg-1',
  threadId: 'thread-1',
  selectedProvider: 'IMAGE_OPENAI',
  selectedModel: 'gpt-image-1',
  routingMode: 'MANUAL_MODEL',
  timestamp: new Date().toISOString(),
};

type Harness = {
  service: ChatMessagesService;
  access: FakePaygAccessControl;
  create: Mock;
  emitError: Mock;
};

function build(): Harness {
  const access = createFakePaygAccessControl({ lockedPlanFeatures: ['allowImageGeneration'] });
  const context = {
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [USER_MESSAGE],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    researchEvidence: [],
    researchRequested: false,
    tokenBudget: 4096,
  };
  const contextAssembly = {
    injectedMemories: vi.fn().mockReturnValue([]),
    assemble: vi.fn().mockResolvedValue(context),
    buildPromptString: vi.fn().mockReturnValue('user prompt'),
    buildChatMessages: vi.fn().mockReturnValue([]),
    buildGeminiChatMessages: vi.fn().mockReturnValue([]),
  };
  const stream = {
    emitRequestAccepted: vi.fn(),
    emitCompletion: vi.fn(),
    emitError: vi.fn(),
    emitRouterStarted: vi.fn(),
    emitProviderSelected: vi.fn(),
    emitResponseStreaming: vi.fn(),
    startResponseProgressHeartbeat: vi.fn().mockReturnValue(vi.fn()),
    emitFallbackAttempt: vi.fn(),
  };
  const executionManager = new ChatExecutionManager(
    contextAssembly as never,
    {
      checkResponseQuality: vi.fn().mockReturnValue({ score: 0.9, reasons: [] }),
      shouldReRoute: vi.fn().mockReturnValue({ shouldReRoute: false }),
    } as never,
    {
      setExecutionManager: vi.fn(),
      shouldActivate: vi.fn().mockReturnValue(false),
      evaluate: vi.fn(),
      buildMetadata: vi.fn().mockReturnValue({}),
    } as never,
    stream as never,
    {
      run: vi.fn(async (_query: string, ctx: unknown) => ({
        context: ctx,
        outcome: { applied: false, results: [], runId: null, warning: null },
      })),
    } as never,
    asAccessControlService(access),
    { uploadFile: vi.fn(), getCachedOrUpload: vi.fn() } as never,
    {
      resolveDefaultModel: vi.fn().mockResolvedValue('qwen3:1.7b'),
      resolveModelList: vi.fn().mockResolvedValue(['qwen3:7b']),
    } as never,
  );
  const create = vi.fn(async (data: Record<string, unknown>) => ({
    ...USER_MESSAGE,
    ...data,
    id: 'msg-2',
  }));
  const service = new ChatMessagesService(
    {
      create,
      findById: vi.fn().mockResolvedValue(USER_MESSAGE),
      findRecentByThreadId: vi.fn().mockResolvedValue([USER_MESSAGE]),
      updateMetadata: vi.fn().mockResolvedValue(undefined),
    } as never,
    {
      findById: vi.fn().mockResolvedValue(THREAD),
      update: vi.fn().mockResolvedValue(undefined),
    } as never,
    executionManager,
    contextAssembly as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    stream as never,
    { render: vi.fn().mockReturnValue(0) } as never,
    { publish: vi.fn().mockResolvedValue(undefined) } as never,
    { write: vi.fn().mockResolvedValue(undefined), getByMessageId: vi.fn() } as never,
    access as never,
    { tryHandleRouted: vi.fn().mockResolvedValue(false) } as never,
    { run: vi.fn().mockResolvedValue(null) } as never,
    {
      reset: vi.fn().mockResolvedValue(undefined),
      append: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue([]),
    } as never,
  );
  return { service, access, create, emitError: stream.emitError };
}

/** The assistant row the turn stored — the one that is not an error row. */
function storedAssistant(create: Mock): Record<string, unknown> {
  const rows: unknown[] = create.mock.calls.map((args: unknown[]) => args[0]);
  const row = rows.find(
    (data): data is Record<string, unknown> =>
      typeof data === 'object' && data !== null && Reflect.get(data, 'role') === 'ASSISTANT',
  );
  expect(row).toBeDefined();
  return row ?? {};
}

describe('image turn on a plan without image generation (ADR-122)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    httpRequest.mockReset();
    appConfigGet.mockReturnValue(APP_CONFIG);
  });

  it('stores a finished refusal with the plan-feature metadata, never calling image-service or reserving', async () => {
    const h = build();

    await h.service.handleMessageRouted(ROUTED);

    const stored = storedAssistant(h.create);
    expect(stored['content']).toBe(IMAGE_GENERATION_PLAN_REFUSAL_TEXT);
    expect(stored['metadata']).toEqual(
      expect.objectContaining({
        type: PLAN_FEATURE_REFUSAL_METADATA_TYPE,
        planFeature: 'allowImageGeneration',
      }),
    );
    expect(stored['metadata']).not.toHaveProperty('generationId');
    expect(stored['metadata']).not.toHaveProperty('errorCode');
    expect(h.emitError).not.toHaveBeenCalled();
    expect(h.access.hasPlanFeatureFor).toHaveBeenCalledWith('user-1', 'allowImageGeneration');
    expect(httpRequest).not.toHaveBeenCalled();
    expect(h.access.reserveCredit).not.toHaveBeenCalled();
  });

  it("stores the same refusal when image-service's own gate answers 403 PLAN_FEATURE_DISABLED", async () => {
    const h = build();
    // chat's courtesy check says yes (plan changed in between); image-service,
    // the authority, refuses.
    h.access.hasPlanFeatureFor.mockResolvedValue(true);
    httpRequest.mockResolvedValue({
      ok: false,
      status: 403,
      data: { statusCode: 403, code: 'PLAN_FEATURE_DISABLED', message: 'Feature not available' },
    });

    await h.service.handleMessageRouted(ROUTED);

    const imageCalls = httpRequest.mock.calls.filter((args: unknown[]) => {
      const options: unknown = args[0];
      const url =
        typeof options === 'object' && options !== null ? Reflect.get(options, 'url') : '';
      return typeof url === 'string' && url.endsWith('/api/v1/internal/images/generate');
    });
    expect(imageCalls).toHaveLength(1);
    const stored = storedAssistant(h.create);
    expect(stored['content']).toBe(IMAGE_GENERATION_PLAN_REFUSAL_TEXT);
    expect(stored['metadata']).toEqual(
      expect.objectContaining({
        type: PLAN_FEATURE_REFUSAL_METADATA_TYPE,
        planFeature: 'allowImageGeneration',
      }),
    );
    expect(stored['metadata']).not.toHaveProperty('generationId');
    expect(h.emitError).not.toHaveBeenCalled();
    expect(h.access.reserveCredit).not.toHaveBeenCalled();
  });
});
