import { vi } from 'vitest';
import type { ChatMessage } from '../../../../generated/prisma';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-service-token'),
  httpRequest: vi.fn(async () => Promise.resolve({ ok: true, status: 200, data: [] })),
  mapResearchModeToWorkflow: vi.fn(),
  runResearch: vi.fn(),
}));

const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));
vi.mock('../../../../app/config/app.config', () => ({ AppConfig: { get: appConfigGet } }));

const PAGES = 150;

/** A user message carrying a finished crawl, the way chat stores it. */
function messageWithCrawl(): ChatMessage {
  const items = Array.from({ length: PAGES }, (_, index) => ({
    id: `e${String(index)}`,
    title: `Page ${String(index)}`,
    url: `https://docs.example.com/p${String(index)}`,
    snippet: 'content '.repeat(250),
    source: 'site_crawl',
    providerKind: null,
    publishedAt: null,
    confidence: 1,
  }));
  return {
    id: 'm1',
    threadId: 't1',
    role: 'USER',
    content: 'Map the whole docs site.',
    metadata: { research: { runId: 'run-1', bundle: { items, warnings: [] } } },
    createdAt: new Date('2026-09-19T00:00:00.000Z'),
  } as never;
}

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

describe('ContextAssemblyManager evidence fitting', () => {
  beforeEach(() => {
    appConfigGet.mockReturnValue({
      FILE_SERVICE_URL: 'http://file-service:4006',
      MEMORY_SERVICE_URL: 'http://memory-service:4005',
      WORKSPACE_SERVICE_URL: 'http://workspace-service:4014',
      RESEARCH_SERVICE_URL: 'http://research-service:4016',
      INTER_SERVICE_AUTH_TOKEN: 'test-service-token',
    });
  });

  // A 150-page crawl is ~300k characters. On a 16k-token model the old code
  // sent it whole; fitted, the best pages stay and the model is told the rest
  // were left out, rather than silently answering from less than was read.
  it('fits a big crawl to a small model and says how many pages were left out', async () => {
    const context = await manager().assemble('u1', [messageWithCrawl()], {
      contextWindowTokens: 16_000,
    } as never);

    expect(context.researchEvidence.length).toBeGreaterThan(0);
    expect(context.researchEvidence.length).toBeLessThan(PAGES);
    expect(context.researchEvidence[0]?.url).toBe('https://docs.example.com/p0');
    expect(
      context.researchWarnings.some((w) => w.includes(`${String(PAGES)} pages were read`)),
    ).toBe(true);
    // The history budget is not driven to zero by the evidence any more.
    expect(context.tokenBudget).toBeGreaterThan(0);
  });

  it('keeps every page for a model whose window holds them', async () => {
    const context = await manager().assemble('u1', [messageWithCrawl()], {
      contextWindowTokens: 1_000_000,
    } as never);

    expect(context.researchEvidence).toHaveLength(PAGES);
    expect(context.researchWarnings).toEqual([]);
  });
});
