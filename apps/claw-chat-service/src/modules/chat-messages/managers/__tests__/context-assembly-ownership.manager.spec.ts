import { vi, type Mock } from 'vitest';
import type { ChatMessage } from '../../../../generated/prisma';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';

vi.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: vi.fn(() => 'Service test-service-token'),
  httpRequest: vi.fn(),
  mapResearchModeToWorkflow: vi.fn(),
  runResearch: vi.fn(),
}));


// AppConfig exposes a STATIC get(); neither a bare automock nor importMock
// hands that same static back, so the spec configured one object while the code
// under test read another. A hoisted vi.fn keeps both on one mock.
const { appConfigGet } = vi.hoisted(() => ({ appConfigGet: vi.fn() }));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: appConfigGet },
}));

const AppConfig = { get: appConfigGet };
const { httpRequest } = await vi.importMock('../../../../common/utilities') as {
  httpRequest: Mock;
};

const userMessage = {
  id: 'message-1',
  threadId: 'thread-1',
  role: 'USER',
  content: 'Inspect the attached file for this tenant.',
  provider: null,
  model: null,
  routingMode: null,
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  estimatedCost: null,
  latencyMs: null,
  feedback: null,
  metadata: null,
  createdAt: new Date('2026-07-29T00:00:00.000Z'),
} as ChatMessage;

/**
 * A repository that owns no data. These specs exercise prompt shaping, not
 * retrieval, and a thread with `useCrossThreadContext` false never reaches the
 * repository at all — the stub proves that rather than hiding it.
 */
function stubCrossThreadRepository(): ConstructorParameters<typeof CrossThreadRetrievalManager>[0] {
  return {
    findCandidateThreads: async () => Promise.resolve([]),
    findMessagesForThreads: async () => Promise.resolve([]),
  } as unknown as ConstructorParameters<typeof CrossThreadRetrievalManager>[0];
}

describe('ContextAssemblyManager attachment ownership contract', () => {
  beforeEach(() => {
    AppConfig.get.mockReturnValue({
      FILE_SERVICE_URL: 'http://file-service:4006',
      MEMORY_SERVICE_URL: 'http://memory-service:4005',
      WORKSPACE_SERVICE_URL: 'http://workspace-service:4014',
      RESEARCH_SERVICE_URL: 'http://research-service:4016',
      INTER_SERVICE_AUTH_TOKEN: 'test-service-token',
    });
    httpRequest.mockImplementation(({ url }: { url: string }) => {
      if (url.includes('/internal/files/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          data: {
            id: 'file-1',
            filename: 'private.txt',
            mimeType: 'text/plain',
            content: Buffer.from('tenant-private-content').toString('base64'),
          },
        });
      }
      if (url.includes('/internal/memories/')) {
        return Promise.resolve({ ok: true, status: 200, data: [] });
      }
      if (url.includes('/internal/workspace/search')) {
        return Promise.resolve({ ok: true, status: 200, data: { results: [] } });
      }
      return Promise.resolve({ ok: false, status: 404, data: {} });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends the authenticated chat user when fetching attached file content', async () => {
    const manager = new ContextAssemblyManager(
      new ContextComposerManager(),
      new CrossThreadRetrievalManager(stubCrossThreadRepository()),
    { needsWeb: async () => ({ needsWeb: false, reason: 'test' }) } as never,
    );

    const context = await manager.assemble('tenant-user-1', [userMessage], undefined, undefined, [
      'file-1',
    ]);

    expect(httpRequest).toHaveBeenCalledWith({
      url: 'http://file-service:4006/api/v1/internal/files/file-1/content?userId=tenant-user-1',
      method: 'GET',
      headers: { Authorization: 'Service test-service-token' },
      timeoutMs: 10_000,
    });
    expect(context.fileContents).toEqual([
      expect.objectContaining({ id: 'file-1', filename: 'private.txt' }),
    ]);
  });
});
