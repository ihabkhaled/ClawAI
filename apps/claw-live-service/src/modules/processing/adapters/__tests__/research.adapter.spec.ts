vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: {
    get: () => ({
      RESEARCH_SERVICE_URL: 'http://research-service:4016',
      INTER_SERVICE_AUTH_TOKEN: 'x'.repeat(32),
    }),
  },
}));

import { LiveResearchClient } from '../research.adapter';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('LiveResearchClient', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('runs a platform-paid SEARCH_ONLY query and keeps title, snippet and host only', async () => {
    fetchMock.mockResolvedValueOnce(
      json({
        status: 'COMPLETED',
        bundle: {
          items: [
            { title: 'Song page', url: 'https://lyrics.example.org/song', snippet: 'A song.' },
            { title: null, url: 'https://untitled.example.org', snippet: 'dropped' },
            { title: 'Bad url', url: 'not a url', snippet: 'dropped' },
          ],
        },
      }),
    );
    const notes = await new LiveResearchClient().search('lyric line lyrics', 'live-research:r:1');
    expect(notes).toEqual([
      {
        query: 'lyric line lyrics',
        title: 'Song page',
        snippet: 'A song.',
        host: 'lyrics.example.org',
      },
    ]);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('http://research-service:4016/api/v1/internal/research/runs');
    expect(init.headers.Authorization).toBe(`Service ${'x'.repeat(32)}`);
    expect(JSON.parse(init.body)).toMatchObject({
      userId: 'platform:live-intelligence',
      intent: 'lyric line lyrics',
      workflow: 'SEARCH_ONLY',
      maxResults: 4,
    });
  });

  it('returns no context on an error status, a bad body or a network failure', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 502))
      .mockResolvedValueOnce(json({ nope: true }))
      .mockRejectedValueOnce(new Error('down'));
    const client = new LiveResearchClient();
    await expect(client.search('q', 'r1')).resolves.toEqual([]);
    await expect(client.search('q', 'r2')).resolves.toEqual([]);
    await expect(client.search('q', 'r3')).resolves.toEqual([]);
  });
});
