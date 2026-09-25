import { vi } from 'vitest';
import { FetchStrategyKind } from '../../../../generated/prisma';
import { SIDECAR_DEFAULT_BASE_URL } from '../../constants/fetch-strategy.constants';
import { ReaderProxyFetchAdapter } from '../reader-proxy-fetch.adapter';

function textResponse(text: string, status = 200): Record<string, unknown> {
  const bytes = new TextEncoder().encode(text);
  return {
    ok: status >= 200 && status < 300,
    status,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

describe('ReaderProxyFetchAdapter', () => {
  const defaultBase = SIDECAR_DEFAULT_BASE_URL[FetchStrategyKind.READER_PROXY] ?? '';

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prefixes the public target with the Jina Reader base URL and returns Markdown', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(textResponse('Title: Example\n\nMarkdown Content:\nHello'));

    const result = await new ReaderProxyFetchAdapter().fetchPage({
      url: 'https://example.com/article',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${defaultBase}https://example.com/article`,
      expect.any(Object),
    );
    expect(result.title).toBe('Example');
    expect(result.mimeType).toBe('text/markdown');
  });

  it('uses the base URL from the strategy config', async () => {
    global.fetch = vi.fn().mockResolvedValue(textResponse('ok'));

    await new ReaderProxyFetchAdapter().fetchPage({
      url: 'https://example.com/',
      strategyConfig: { baseUrl: 'https://reader.internal/' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://reader.internal/https://example.com/',
      expect.any(Object),
    );
  });

  it("surfaces the target's own error status from the reader's answer", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(textResponse('Warning: Target URL returned error 404: Not Found'));

    const result = await new ReaderProxyFetchAdapter().fetchPage({
      url: 'https://example.com/gone',
    });

    expect(result.httpStatus).toBe(404);
  });

  it.each([
    ['a private host', 'http://10.0.0.1/wiki'],
    ['a URL carrying a token', 'https://example.com/doc?token=abc'],
    ['a signed-in-only app', 'https://docs.google.com/document/d/1'],
  ])('never sends %s to the third-party reader', async (_label, url) => {
    global.fetch = vi.fn();

    await expect(new ReaderProxyFetchAdapter().fetchPage({ url })).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('throws when the reader itself fails', async () => {
    global.fetch = vi.fn().mockResolvedValue(textResponse('', 502));

    await expect(
      new ReaderProxyFetchAdapter().fetchPage({ url: 'https://example.com/' }),
    ).rejects.toThrow(/HTTP 502/u);
  });

  it('spaces consecutive reader calls by the rate limit', async () => {
    global.fetch = vi.fn().mockImplementation(async () => textResponse('ok'));
    const adapter = new ReaderProxyFetchAdapter();

    await adapter.fetchPage({ url: 'https://example.com/1' });
    const second = adapter.fetchPage({ url: 'https://example.com/2' });
    await vi.advanceTimersByTimeAsync(100);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4_000);
    await second;
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
