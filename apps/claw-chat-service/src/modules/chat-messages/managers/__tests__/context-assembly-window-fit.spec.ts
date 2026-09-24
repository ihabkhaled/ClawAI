import { vi } from 'vitest';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';
import { estimateTokensFromText } from '../../utilities/token-estimator.utility';
import { fitTextsToBudget } from '../../utilities/text-budget.utility';
import { ChatContextGatewayManager } from '../chat-context-gateway.manager';
import { ChatSurface } from '../../../../common/enums/chat-surface.enum';
import { CONSERVATIVE_CONTEXT_WINDOW_TOKENS } from '../../constants/context-composer.constants';
import type { AssembledContext } from '../../types/context.types';

const { appConfigGet, httpRequest } = vi.hoisted(() => ({
  appConfigGet: vi.fn(),
  httpRequest: vi.fn(),
}));

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service t'),
  httpRequest,
  mapResearchModeToWorkflow: vi.fn(),
  runResearch: vi.fn(),
}));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const BIG = 'lorem ipsum dolor sit amet '.repeat(4_000); // ~108k chars

// Everything oversized at once: the production failure was memories, context
// packs, thread history, a crawl and files all arriving together.
function wireOversizedSources(): void {
  httpRequest.mockImplementation(({ url }: { url: string }) => {
    if (url.includes('/internal/memories/retrieve')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        data: {
          memories: Array.from({ length: 40 }, (_, i) => ({
            id: `m${String(i)}`,
            type: 'FACT',
            content: BIG.slice(0, 6_000),
          })),
        },
      });
    }
    if (url.includes('/internal/context-packs/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        data: { items: Array.from({ length: 10 }, () => ({ type: 'TEXT', content: BIG })) },
      });
    }
    if (url.includes('/ingestion-state')) {
      return Promise.resolve({ ok: true, status: 200, data: { status: 'READY' } });
    }
    return url.includes('/internal/files/') ? Promise.resolve({
        ok: true,
        status: 200,
        data: {
          id: 'f1',
          filename: 'huge.txt',
          mimeType: 'text/plain',
          content: Buffer.from('bytes').toString('base64'),
          extractedText: BIG,
          ingestionStatus: 'READY',
        },
      }) : Promise.resolve({ ok: true, status: 200, data: [] });
  });
}

const history = Array.from({ length: 60 }, (_, i) => ({
  id: `h${String(i)}`,
  threadId: 't1',
  role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
  content: BIG.slice(0, 8_000),
  metadata:
    i === 59
      ? {
          research: {
            runId: 'r1',
            bundle: {
              items: Array.from({ length: 200 }, (_, n) => ({
                id: `e${String(n)}`,
                title: `Page ${String(n)}`,
                url: `https://docs.example.com/p${String(n)}`,
                snippet: BIG.slice(0, 3_000),
                source: 'site_crawl',
                providerKind: null,
                publishedAt: null,
                confidence: 1,
              })),
              warnings: [],
            },
          },
        }
      : null,
  createdAt: new Date(Date.UTC(2026, 8, 19, 0, i)),
}));

function manager(): ContextAssemblyManager {
  return new ContextAssemblyManager(
    new ContextComposerManager(),
    new CrossThreadRetrievalManager({
      findCandidateThreads: async () => Promise.resolve([]),
      findMessagesForThreads: async () => Promise.resolve([]),
    } as never),
    { needsWeb: async () => ({ needsWeb: false, reason: 'test' }) } as never,
    { hasResearchAccess: async () => true } as never,
  );
}

describe('ContextAssemblyManager fits every source to the model window', () => {
  beforeEach(() => {
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file',
      MEMORY_SERVICE_URL: 'http://memory',
      WORKSPACE_SERVICE_URL: 'http://workspace',
      RESEARCH_SERVICE_URL: 'http://research',
      INTER_SERVICE_AUTH_TOKEN: 't',
    });
    wireOversizedSources();
  });

  // Eight real window sizes: small local models through Gemini 1.5 Pro.
  it.each([
    ['llama-8k', 8_192],
    ['small-16k', 16_384],
    ['qwen-32k', 32_768],
    ['deepseek-64k', 65_536],
    ['gpt-4o-128k', 128_000],
    ['claude-200k', 200_000],
    ['gemini-1m', 1_048_576],
    ['gemini-pro-2m', 2_097_152],
  ])('%s: the assembled prompt stays inside %d tokens', async (_name, window) => {
    const context = await manager().assemble(
      'u1',
      history as never,
      { contextWindowTokens: window, maxTokens: 1_024 } as never,
      ['pack-1'],
      ['f1'],
    );

    const promptTokens = estimateTokensFromText(
      manager()
        .buildChatMessages(context)
        .map((message) =>
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        )
        .join('\n'),
    );

    expect(promptTokens).toBeLessThanOrEqual(window);
    // Something of every source survives even on the smallest model.
    expect(context.researchEvidence.length).toBeGreaterThan(0);
    expect(context.memories.length).toBeGreaterThan(0);
    expect(context.fileContents[0]?.extractedText?.length ?? 0).toBeGreaterThan(0);
  });

  it('keeps everything whole when the window is big enough', async () => {
    httpRequest.mockImplementation(() =>
      Promise.resolve({ ok: true, status: 200, data: { memories: [], items: [] } }),
    );
    const context = await manager().assemble(
      'u1',
      history.slice(0, 2) as never,
      { contextWindowTokens: 2_097_152 } as never,
    );

    expect(context.researchWarnings).toEqual([]);
  });
});

// Rule 51 item 4, compare: ONE context goes to every lane, so it is budgeted
// for the smallest lane's real window. Compare used to name no model at all
// and budgeted a 1M-token lane and an 8k lane alike at the 8k fallback.
describe('compare budgets one shared context for its smallest lane', () => {
  const promptTokensOf = (context: AssembledContext): number =>
    estimateTokensFromText(
      manager()
        .buildChatMessages(context)
        .map((message) =>
          typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        )
        .join('\n'),
    );

  function gateway(windows: Record<string, number>): ChatContextGatewayManager {
    return new ChatContextGatewayManager(
      { findRecentByThreadId: async () => Promise.resolve([...history].reverse()) } as never,
      {
        findById: async () =>
          Promise.resolve({
            id: 't1',
            systemPrompt: null,
            maxTokens: 1_024,
            contextPackIds: ['pack-1'],
            useCrossThreadContext: false,
          }),
      } as never,
      manager(),
      {
        findContextWindowTokens: async (provider: string, model: string) =>
          Promise.resolve(windows[`${provider}/${model}`] ?? null),
      } as never,
    );
  }

  const build = async (windows: Record<string, number>, lanes: string[]) =>
    gateway(windows).build({
      userId: 'u1',
      threadId: 't1',
      surface: ChatSurface.COMPARE,
      laneTargets: lanes.map((lane) => {
        const [provider = '', model = ''] = lane.split('/');
        return { provider, model };
      }),
      fileIds: ['f1'],
    });

  beforeEach(() => {
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file',
      MEMORY_SERVICE_URL: 'http://memory',
      WORKSPACE_SERVICE_URL: 'http://workspace',
      RESEARCH_SERVICE_URL: 'http://research',
      INTER_SERVICE_AUTH_TOKEN: 't',
    });
    wireOversizedSources();
  });

  it('fits the prompt inside the smallest lane, not the largest', async () => {
    const bundle = await build(
      { 'GEMINI/gemini-2.5-flash': 1_048_576, 'LLAMACPP/llama-8k': 8_192 },
      ['GEMINI/gemini-2.5-flash', 'LLAMACPP/llama-8k'],
    );

    expect(bundle.context.modelBudget.contextWindowTokens).toBe(8_192);
    expect(promptTokensOf(bundle.context)).toBeLessThanOrEqual(8_192);
  });

  it('uses the real window when every lane is large, instead of the 8k fallback', async () => {
    const bundle = await build(
      { 'GEMINI/gemini-2.5-flash': 1_048_576, 'ANTHROPIC/claude-sonnet-4': 200_000 },
      ['GEMINI/gemini-2.5-flash', 'ANTHROPIC/claude-sonnet-4'],
    );

    expect(bundle.context.modelBudget.contextWindowTokens).toBe(200_000);
    expect(bundle.context.modelBudget.source).toBe('MODEL_CATALOG');
  });

  it('keeps the conservative window when any lane window is unknown', async () => {
    const bundle = await build({ 'GEMINI/gemini-2.5-flash': 1_048_576 }, [
      'GEMINI/gemini-2.5-flash',
      'SOME_PROVIDER/unenriched-model',
    ]);

    expect(bundle.context.modelBudget.contextWindowTokens).toBe(CONSERVATIVE_CONTEXT_WINDOW_TOKENS);
    expect(promptTokensOf(bundle.context)).toBeLessThanOrEqual(CONSERVATIVE_CONTEXT_WINDOW_TOKENS);
  });
});

describe('fitTextsToBudget', () => {
  it('keeps everything when it fits', () => {
    expect(fitTextsToBudget(['a', 'b'], 10)).toEqual({ texts: ['a', 'b'], dropped: 0 });
  });

  it('shortens evenly before dropping', () => {
    const result = fitTextsToBudget(['x'.repeat(1_000), 'y'.repeat(1_000)], 1_000);
    expect(result.dropped).toBe(0);
    expect(result.texts[0]?.startsWith('x'.repeat(500))).toBe(true);
  });

  it('drops from the tail when even shortening is not enough', () => {
    const result = fitTextsToBudget(
      Array.from({ length: 50 }, () => 'z'.repeat(1_000)),
      1_000,
    );
    expect(result.dropped).toBeGreaterThan(0);
    expect(result.texts.length + result.dropped).toBe(50);
  });
});
