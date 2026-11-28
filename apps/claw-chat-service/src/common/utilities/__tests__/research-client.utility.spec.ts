import { vi } from 'vitest';
import { ResearchWorkflow } from '../../enums/research-workflow.enum';
import { fetchPageViaResearch, runResearch } from '../research-client.utility';
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
        timeoutMs: 60_000,
        body: expect.objectContaining({
          maxResults: 6,
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

  // Research engine B1/B2: the new fields are additive and travel only when set, so an older research-service
  // and every caller that sets none (threads-service included) see exactly the old body.
  it('sends the research engine fields when set', async () => {
    mockedHttpRequest.mockResolvedValue({ ok: true, status: 200, data: { id: 'run-4' } } as never);

    await runResearch('http://localhost:4016', {
      userToken: 'token',
      userId: 'u1',
      intent: 'why did the ceo quit',
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
      threadId: 'thread-7',
      queries: ['who replaced him'],
      languages: ['en', 'ar'],
      depth: 2,
      round: 2,
      excludeUrls: ['https://a.example/'],
    });

    expect(mockedHttpRequest.mock.calls[0]?.[0].body).toMatchObject({
      threadId: 'thread-7',
      queries: ['who replaced him'],
      languages: ['en', 'ar'],
      depth: 2,
      round: 2,
      excludeUrls: ['https://a.example/'],
    });
  });

  it('leaves every research engine field off the body when none is set, or a list is empty', async () => {
    mockedHttpRequest.mockResolvedValue({ ok: true, status: 200, data: { id: 'run-5' } } as never);

    await runResearch('http://localhost:4016', {
      userToken: 'token',
      userId: 'u1',
      intent: 'latest news',
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
      queries: [],
      languages: [],
      excludeUrls: [],
    });

    const body = mockedHttpRequest.mock.calls[0]?.[0].body as Record<string, unknown>;
    for (const key of ['threadId', 'queries', 'languages', 'depth', 'round', 'excludeUrls']) {
      expect(body).not.toHaveProperty(key);
    }
  });

  it('sends depth 0 and round 1 as real values, not as absent', async () => {
    mockedHttpRequest.mockResolvedValue({ ok: true, status: 200, data: { id: 'run-6' } } as never);

    await runResearch('http://localhost:4016', {
      userToken: 'token',
      userId: 'u1',
      intent: 'x',
      workflow: ResearchWorkflow.SEARCH_THEN_FETCH,
      depth: 0,
      round: 1,
    });

    expect(mockedHttpRequest.mock.calls[0]?.[0].body).toMatchObject({ depth: 0, round: 1 });
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

describe('fetchPageViaResearch', () => {
  beforeEach(() => {
    mockedHttpRequest.mockReset();
  });

  it('uses the internal service-token fetch route, names the user, sends no bearer', async () => {
    mockedHttpRequest.mockResolvedValue({
      ok: true,
      status: 200,
      data: { url: 'https://example.com/', title: null, content: 'c', links: [] },
    } as never);

    const outcome = await fetchPageViaResearch('http://localhost:4016', {
      userId: 'u1',
      url: 'https://example.com/',
    });

    const call = mockedHttpRequest.mock.calls[0]?.[0];
    expect(call?.url).toBe('http://localhost:4016/api/v1/internal/research/fetch');
    expect(call?.headers).toEqual({ Authorization: 'Service test-token' });
    expect(call?.body).toEqual({ userId: 'u1', url: 'https://example.com/' });
    expect(outcome.ok).toBe(true);
  });

  it('reports a refusal with its status and message instead of throwing', async () => {
    mockedHttpRequest.mockResolvedValue({
      ok: false,
      status: 403,
      data: { message: 'disallowed by robots.txt' },
    } as never);

    await expect(
      fetchPageViaResearch('http://localhost:4016', { userId: 'u1', url: 'https://a.example/' }),
    ).resolves.toEqual({ ok: false, status: 403, message: 'disallowed by robots.txt' });
  });

  it('reports a transport failure as status 0', async () => {
    mockedHttpRequest.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      fetchPageViaResearch('http://localhost:4016', { userId: 'u1', url: 'https://a.example/' }),
    ).resolves.toMatchObject({ ok: false, status: 0 });
  });
});
