// Mid-generation crawl retrieval (ADR-093) at the ChatExecutionManager
// boundary: an Ollama Cloud candidate offered a `get_crawled_page` tool for
// this turn's SITE_CRAWL pages, resolved from memory rather than a second
// network call, through the SAME agentic loop and per-turn PAYG metering
// `runOllamaCloudToolLoop` already uses for web_search/web_fetch.

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
import type { CrawlRetrievalContext } from '../types/crawl-retrieval.types';
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
  OLLAMA_TOOL_LOOP_MAX_ITERATIONS: 50,
  OLLAMA_TOOL_LOOP_TOTAL_TIMEOUT_MS: 600_000,
  AUTH_SERVICE_URL: 'http://auth:4001',
  ENABLE_GEMINI_FILES_API: false,
};

const makeContext = (): AssembledContext =>
  ({
    userId: 'user-1',
    systemPrompt: null,
    threadMessages: [{ id: 'm1', threadId: 'thread-1', role: 'USER', content: 'audit the site' }],
    memories: [],
    contextPackItems: [],
    fileContents: [],
    workspaceCitations: [],
    tokenBudget: 4096,
  }) as unknown as AssembledContext;

const CRAWL_RETRIEVAL: CrawlRetrievalContext = {
  pages: [
    { url: 'https://example.com/', title: 'Home', content: 'Homepage full text' },
    { url: 'https://example.com/about', title: 'About', content: 'About page full text' },
  ],
};

const connectorConfigResponse = {
  ok: true,
  status: 200,
  data: { provider: 'OLLAMA', apiKey: 'k', baseUrl: 'http://localhost:11434' },
};

function toolCallTurn(toolName: string, args: Record<string, unknown>): unknown {
  return {
    ok: true,
    status: 200,
    data: {
      model: 'deepseek-v4-pro',
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [{ function: { name: toolName, arguments: args } }],
      },
      done: true,
      done_reason: 'stop',
      prompt_eval_count: 20,
      eval_count: 8,
    },
  };
}

function finalTurn(content: string): unknown {
  return {
    ok: true,
    status: 200,
    data: {
      model: 'deepseek-v4-pro',
      message: { role: 'assistant', content },
      done: true,
      done_reason: 'stop',
      prompt_eval_count: 40,
      eval_count: 16,
    },
  };
}

const buildExecution = (
  access: ReturnType<typeof createFakePaygAccessControl>,
): ChatExecutionManager =>
  new ChatExecutionManager(
    {
      buildPromptString: jest.fn().mockReturnValue('a prompt of some length'),
      buildChatMessages: jest.fn().mockReturnValue([{ role: 'user', content: 'audit the site' }]),
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
    {
      emitRouterStarted: jest.fn(),
      emitProviderSelected: jest.fn(),
      emitResponseStreaming: jest.fn(),
      startResponseProgressHeartbeat: jest.fn().mockReturnValue(jest.fn()),
      emitFallbackAttempt: jest.fn(),
      emitError: jest.fn(),
      emitProgressStage: jest.fn(),
    } as unknown as ChatStreamService,
    {
      run: jest.fn().mockImplementation(async (_q: string, ctx: unknown) => ({
        context: ctx,
        outcome: { applied: false, results: [], runId: null, warning: null },
      })),
    } as unknown as SearchFirstManager,
    access as unknown as AccessControlService,
    { uploadFile: jest.fn(), getCachedOrUpload: jest.fn() } as unknown as GeminiFilesApiManager,
    {
      resolveDefaultModel: jest.fn().mockResolvedValue('qwen3:1.7b'),
      resolveModelList: jest.fn().mockResolvedValue(['qwen3:7b']),
    } as unknown as LocalModelSelectionService,
  );

describe('ChatExecutionManager — mid-generation crawl retrieval', () => {
  let accessControl: ReturnType<typeof createFakePaygAccessControl>;
  let manager: ChatExecutionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    AppConfig.get.mockReturnValue(DEFAULT_APP_CONFIG);
    accessControl = createFakePaygAccessControl();
    manager = buildExecution(accessControl);
  });

  it('answers get_crawled_page from memory — no extra network call for the tool itself', async () => {
    httpRequest
      .mockResolvedValueOnce(connectorConfigResponse)
      .mockResolvedValueOnce(toolCallTurn('get_crawled_page', { url: 'https://example.com/about' }))
      .mockResolvedValueOnce(finalTurn('The about page says: About page full text'));

    const result = await manager.execute(
      {
        messageId: 'msg-1',
        threadId: 'thread-1',
        selectedProvider: 'OLLAMA',
        selectedModel: 'deepseek-v4-pro',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
      },
      makeContext(),
      undefined,
      CRAWL_RETRIEVAL,
    );

    // connector config + turn 1 + turn 2 — no fourth call proxying the tool
    // to Ollama Cloud's own endpoints, unlike web_search/web_fetch.
    expect(httpRequest).toHaveBeenCalledTimes(3);
    expect(result.content).toContain('About page full text');
    expect(result.toolTranscript?.turns).toHaveLength(1);
    expect(result.toolTranscript?.turns[0]).toMatchObject({ tool: 'get_crawled_page', ok: true });
  });

  it('attaches get_crawled_page to the request with every crawled URL listed', async () => {
    httpRequest
      .mockResolvedValueOnce(connectorConfigResponse)
      .mockResolvedValueOnce(finalTurn('No tool needed.'));

    await manager.execute(
      {
        messageId: 'msg-2',
        threadId: 'thread-1',
        selectedProvider: 'OLLAMA',
        selectedModel: 'deepseek-v4-pro',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
      },
      makeContext(),
      undefined,
      CRAWL_RETRIEVAL,
    );

    const turnCall = httpRequest.mock.calls[1]?.[0] as {
      body: { tools?: Array<{ function: { name: string; description: string } }> };
    };
    const tool = turnCall.body.tools?.find((t) => t.function.name === 'get_crawled_page');
    expect(tool).toBeDefined();
    expect(tool?.function.description).toContain('https://example.com/');
    expect(tool?.function.description).toContain('https://example.com/about');
  });

  it('takes one PAYG hold per turn — the outer chokepoint never holds for the same completion twice', async () => {
    httpRequest
      .mockResolvedValueOnce(connectorConfigResponse)
      .mockResolvedValueOnce(toolCallTurn('get_crawled_page', { url: 'https://example.com/' }))
      .mockResolvedValueOnce(finalTurn('Done.'));

    await manager.execute(
      {
        messageId: 'msg-3',
        threadId: 'thread-1',
        selectedProvider: 'OLLAMA',
        selectedModel: 'deepseek-v4-pro',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
      },
      makeContext(),
      undefined,
      CRAWL_RETRIEVAL,
    );

    // Two completions (turn 1 + turn 2) => two holds. A single hold for the
    // whole run — what the outer `callProvider` chokepoint would have taken
    // had this path gone through it — would double- or under-bill.
    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(2);
  });

  it('leaves an ordinary Ollama Cloud call with no crawlRetrieval on the normal single-shot path', async () => {
    httpRequest
      .mockResolvedValueOnce(connectorConfigResponse)
      .mockResolvedValueOnce(finalTurn('Ordinary answer, no tools.'));

    const result = await manager.execute(
      {
        messageId: 'msg-4',
        threadId: 'thread-1',
        selectedProvider: 'OLLAMA',
        selectedModel: 'deepseek-v4-pro',
        routingMode: 'MANUAL_MODEL',
        timestamp: new Date().toISOString(),
      },
      makeContext(),
    );

    expect(result.content).toBe('Ordinary answer, no tools.');
    expect(result.toolTranscript).toBeUndefined();
    // The single-shot path takes exactly one hold via the outer chokepoint.
    expect(accessControl.reserveCredit).toHaveBeenCalledTimes(1);
  });
});
