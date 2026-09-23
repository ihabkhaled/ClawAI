import { type Mock, vi } from 'vitest';
import { resetInternalHostAllowlist } from '@claw/shared-utilities';

import { BraveAdapter } from '../brave.adapter';
import { ExaAdapter } from '../exa.adapter';
import { FirecrawlAdapter } from '../firecrawl.adapter';
import { OllamaWebSearchAdapter } from '../ollama-web.adapter';
import { SearxngAdapter } from '../searxng.adapter';
import { SerpApiAdapter } from '../serpapi.adapter';
import { TavilyAdapter } from '../tavily.adapter';
import type { SearchAdapter } from '../search-adapter.interface';
import type { SearchAdapterContext } from '../../types/search.types';

/**
 * TD-040. Every search-provider call carries the provider's API key, so its URL
 * is checked before it is sent. Unlike the crawler (fetch/adapters/
 * http-fetch.adapter.ts), none of these fetch a URL a user typed: the
 * destination is the operator-configured `baseUrl` of the provider row, or the
 * adapter's own default literal when that is blank. That is the connector
 * pattern — `declaredHost(base)` — so the adapters are guarded rather than
 * exempted.
 *
 * The "reaches" cases run with a CI-shaped environment. A GitHub runner defines
 * `*_ENDPOINT` variables, which makes the host check ENFORCE rather than stand
 * down, and a fake host that passes locally is refused there. Stubbing one here
 * proves the real destinations are still allowed, not that the check was
 * skipped.
 */

type AdapterCase = {
  name: string;
  build: () => SearchAdapter;
  configuredBase: string;
  /** Host used when the provider row has no baseUrl; null when the adapter requires one. */
  defaultHost: string | null;
};

const CASES: AdapterCase[] = [
  {
    name: 'Brave',
    build: () => new BraveAdapter(),
    configuredBase: 'https://brave.proxy.example',
    defaultHost: 'api.search.brave.com',
  },
  {
    name: 'Exa',
    build: () => new ExaAdapter(),
    configuredBase: 'https://exa.proxy.example',
    defaultHost: 'api.exa.ai',
  },
  {
    name: 'Firecrawl',
    build: () => new FirecrawlAdapter(),
    configuredBase: 'http://firecrawl:3002',
    defaultHost: 'api.firecrawl.dev',
  },
  {
    name: 'Ollama Web',
    build: () => new OllamaWebSearchAdapter(),
    configuredBase: 'https://ollama.proxy.example',
    defaultHost: 'ollama.com',
  },
  {
    name: 'SearXNG',
    build: () => new SearxngAdapter(),
    configuredBase: 'http://searxng:8080/',
    defaultHost: null,
  },
  {
    name: 'SerpApi',
    build: () => new SerpApiAdapter(),
    configuredBase: 'https://serpapi.proxy.example',
    defaultHost: 'serpapi.com',
  },
  {
    name: 'Tavily',
    build: () => new TavilyAdapter(),
    configuredBase: 'https://tavily.proxy.example',
    defaultHost: 'api.tavily.com',
  },
];

const HOSTILE_BASES: ReadonlyArray<[string, string]> = [
  ['a file: URL', 'file:///etc'],
  ['embedded credentials', 'https://user:pass@api.tavily.com'],
  ['the cloud metadata address', 'http://169.254.169.254'],
];

function contextFor(baseUrl: string): SearchAdapterContext {
  return { baseUrl, credentials: { apiKey: 'k' }, publicConfig: {}, timeoutMs: 1_000 };
}

function enforceLikeCi(): void {
  vi.stubEnv('ACTIONS_RESULTS_ENDPOINT', 'https://x.example');
  resetInternalHostAllowlist();
}

function firstCall(fetchMock: Mock): { host: string; init: RequestInit } {
  const [target, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
  return { host: new URL(String(target)).host, init };
}

describe('search adapters go through the outbound URL guard', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    // A 500 is enough: it proves the request was built, checked and sent.
    fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetInternalHostAllowlist();
    vi.restoreAllMocks();
  });

  describe.each(CASES)('$name', ({ build, configuredBase, defaultHost }) => {
    it('reaches the operator-configured base with enforcement on, and never follows a redirect', async () => {
      enforceLikeCi();

      await expect(
        build().search({ query: 'q', maxResults: 3 }, contextFor(configuredBase)),
      ).rejects.toThrow(/HTTP 500/);

      const { host, init } = firstCall(fetchMock);
      expect(host).toBe(new URL(configuredBase).host);
      expect(init.redirect).toBe('error');
    });

    if (defaultHost !== null) {
      it('reaches its default provider host with enforcement on when no base is configured', async () => {
        enforceLikeCi();

        await expect(build().search({ query: 'q', maxResults: 3 }, contextFor(''))).rejects.toThrow(
          /HTTP 500/,
        );

        expect(firstCall(fetchMock).host).toBe(defaultHost);
      });
    }

    it.each(HOSTILE_BASES)('refuses %s before the key is sent', async (_label, hostile) => {
      await expect(
        build().search({ query: 'q', maxResults: 3 }, contextFor(hostile)),
      ).rejects.toThrow(/httpRequest/);
      const health = await build().healthCheck(contextFor(hostile));

      expect(health.healthy).toBe(false);
      expect(health.errorMessage).toMatch(/httpRequest/);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  // The keyless fallbacks are fixed literals on the adapter, declared one by
  // one. Both must stay reachable under enforcement or research silently loses
  // its last resort whenever the primary is unauthorised.
  it('Ollama Web reaches the DuckDuckGo and Bing fallbacks with enforcement on', async () => {
    enforceLikeCi();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '<html></html>' })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '<rss></rss>' });

    await new OllamaWebSearchAdapter().search(
      { query: 'q', maxResults: 3 },
      contextFor('https://ollama.com'),
    );

    const calls = fetchMock.mock.calls as Array<[URL, RequestInit]>;
    expect(calls.map(([target]) => new URL(String(target)).host)).toEqual([
      'ollama.com',
      'html.duckduckgo.com',
      'www.bing.com',
    ]);
    for (const [, init] of calls) {
      expect(init.redirect).toBe('error');
    }
  });
});
