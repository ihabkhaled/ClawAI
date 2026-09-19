import { vi } from 'vitest';
import { ResearchWorkflow } from '../../enums/research-workflow.enum';
import { runResearch } from '../research-client.utility';
import { httpRequest } from '../http-client.utility';

vi.mock('../http-client.utility', () => ({
  httpRequest: vi.fn(),
}));

vi.mock('../inter-service-auth.utility', () => ({
  buildInterServiceAuthHeader: () => 'Service test-token',
}));

const mockedHttpRequest = vi.mocked(httpRequest);

describe('runResearch', () => {
  beforeEach(() => {
    mockedHttpRequest.mockReset();
  });

  // Forwarding the user's bearer to the user route got every non-admin a 403
  // (that route is ADMIN_SYSTEM_VIEW), swallowed to null: research silently ran
  // for admins only. The internal route names the user and carries the service
  // token instead — the plan gate has already been applied in this service.
  it('calls the internal service-token route and names the user', async () => {
    mockedHttpRequest.mockResolvedValue({ ok: true, status: 200, data: { id: 'run-0' } } as never);

    await runResearch('http://localhost:4016', {
      userToken: 'user-bearer-that-must-not-be-sent',
      userId: 'u1',
      intent: 'summarise example.com',
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
    });

    const call = mockedHttpRequest.mock.calls[0]?.[0];
    expect(call?.url).toBe('http://localhost:4016/api/v1/internal/research/runs');
    expect(call?.headers).toEqual({ Authorization: 'Service test-token' });
    expect(call?.body).toMatchObject({ userId: 'u1', intent: 'summarise example.com' });
    expect(JSON.stringify(call)).not.toContain('user-bearer-that-must-not-be-sent');
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
