import type { ChatMessage } from '../../../../generated/prisma';
import { ContextAssemblyManager } from '../context-assembly.manager';
import { ContextComposerManager } from '../context-composer.manager';
import { CrossThreadRetrievalManager } from '../cross-thread-retrieval.manager';

jest.mock('../../../../common/utilities', () => ({
  buildInterServiceAuthHeader: jest.fn(() => 'Service test-service-token'),
  httpRequest: jest.fn(),
  mapResearchModeToWorkflow: jest.fn(),
  runResearch: jest.fn(),
}));

jest.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: jest.fn() },
}));

const { AppConfig } = jest.requireMock('../../../../app/config/app.config') as {
  AppConfig: { get: jest.Mock };
};
const { httpRequest } = jest.requireMock('../../../../common/utilities') as {
  httpRequest: jest.Mock;
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
    jest.clearAllMocks();
  });

  it('sends the authenticated chat user when fetching attached file content', async () => {
    const manager = new ContextAssemblyManager(
      new ContextComposerManager(),
      new CrossThreadRetrievalManager(stubCrossThreadRepository()),
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
