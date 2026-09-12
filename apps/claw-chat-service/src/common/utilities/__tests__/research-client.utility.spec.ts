import { ResearchWorkflow } from '../../enums/research-workflow.enum';
import { runResearch } from '../research-client.utility';
import { httpRequest } from '../http-client.utility';

jest.mock('../http-client.utility', () => ({
  httpRequest: jest.fn(),
}));

const mockedHttpRequest = jest.mocked(httpRequest);

describe('runResearch', () => {
  beforeEach(() => {
    mockedHttpRequest.mockReset();
  });

  it('uses workflow-based maxResults defaults and timeout', async () => {
    mockedHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: 'run-1' },
    } as never);

    await runResearch('http://localhost:4016', {
      userToken: 'token',
      userId: 'u1',
      intent: 'latest cloud updates',
      workflow: ResearchWorkflow.SEARCH_FETCH_EXTRACT,
    });

    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 30_000,
        body: expect.objectContaining({
          maxResults: 4,
        }),
      }),
    );
  });

  it('preserves explicit maxResults when provided', async () => {
    mockedHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: 'run-2' },
    } as never);

    await runResearch('http://localhost:4016', {
      userToken: 'token',
      userId: 'u1',
      intent: 'pricing research',
      workflow: ResearchWorkflow.SEARCH_ONLY,
      maxResults: 9,
    });

    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          maxResults: 9,
        }),
      }),
    );
  });

  it('forwards correlationId so research-service can route SITE_CRAWL progress ticks', async () => {
    mockedHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { id: 'run-3' },
    } as never);

    await runResearch('http://localhost:4016', {
      userToken: 'token',
      userId: 'u1',
      intent: 'crawl https://example.com/',
      workflow: ResearchWorkflow.SITE_CRAWL,
      correlationId: 'thread-42',
    });

    expect(mockedHttpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          correlationId: 'thread-42',
        }),
      }),
    );
  });

  it('returns null on non-2xx responses', async () => {
    mockedHttpRequest.mockResolvedValue({
      ok: false,
      status: 424,
      data: {},
    } as never);

    const result = await runResearch('http://localhost:4016', {
      userToken: 'token',
      userId: 'u1',
      intent: 'security hardening',
      workflow: ResearchWorkflow.SEARCH_ONLY,
    });

    expect(result).toBeNull();
  });
});
