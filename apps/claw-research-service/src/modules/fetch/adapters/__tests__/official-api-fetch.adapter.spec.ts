import { type Mock, vi } from 'vitest';
import { AppConfig } from '../../../../app/config/app.config';
import { OfficialApiFetchAdapter } from '../official-api-fetch.adapter';

const pinnedFetchMock = vi.hoisted(() => vi.fn());
vi.mock('../../utilities/pinned-fetch.utility', () => ({ pinnedFetch: pinnedFetchMock }));
vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn() },
}));

function response(body: string, status = 200): Record<string, unknown> {
  const bytes = new TextEncoder().encode(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

describe('OfficialApiFetchAdapter', () => {
  const adapter = new OfficialApiFetchAdapter();

  beforeEach(() => {
    vi.clearAllMocks();
    (AppConfig.get as Mock).mockReturnValue({ RESEARCH_DOMAIN_ALLOWLIST: [] });
  });

  it('supports only URLs with a known official API', () => {
    expect(adapter.supports('https://en.wikipedia.org/wiki/Web_scraping')).toBe(true);
    expect(adapter.supports('https://github.com/apify/impit')).toBe(true);
    expect(adapter.supports('https://example.com/')).toBe(false);
  });

  it('reads a GitHub README through the API and titles it with the repo', async () => {
    pinnedFetchMock.mockReset().mockResolvedValue(response('# impit\n\nBrowser impersonation'));

    const result = await adapter.fetchPage({ url: 'https://github.com/apify/impit' });

    expect(pinnedFetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/apify/impit/readme',
      expect.anything(),
      expect.objectContaining({ headers: expect.anything() }),
    );
    expect(result.title).toBe('apify/impit');
    expect(result.content).toContain('Browser impersonation');
    expect(result.finalUrl).toBe('https://github.com/apify/impit');
  });

  it('throws on a non-2xx API answer so the chain moves on', async () => {
    pinnedFetchMock.mockReset().mockResolvedValue(response('{"message":"Not Found"}', 404));

    await expect(adapter.fetchPage({ url: 'https://github.com/apify/no-readme' })).rejects.toThrow(
      /GITHUB API answered HTTP 404/u,
    );
  });

  it('throws for a URL it does not support', async () => {
    await expect(adapter.fetchPage({ url: 'https://example.com/' })).rejects.toThrow(
      /No official API/u,
    );
  });

  it('refuses an API redirect to a loopback host before requesting it', async () => {
    pinnedFetchMock.mockReset().mockResolvedValueOnce({
      ok: false,
      status: 302,
      headers: {
        get: (name: string) => (name === 'location' ? 'http://127.0.0.1:4016/api' : null),
      },
      body: null,
    });

    await expect(adapter.fetchPage({ url: 'https://github.com/apify/impit' })).rejects.toThrow();
    expect(pinnedFetchMock).toHaveBeenCalledTimes(1);
  });
});
