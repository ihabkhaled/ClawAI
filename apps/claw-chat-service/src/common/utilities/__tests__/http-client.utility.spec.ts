import { vi } from 'vitest';
import { declaredHost } from '@claw/shared-utilities';
import {
  httpPostBinary,
  httpReadBinaryBase64,
  httpRequest,
  httpStream,
  httpStreamBinary,
} from '../http-client.utility';

const ALLOWED = declaredHost('https://provider.example');

describe('httpRequest cancellation', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('composes a caller abort signal with the request timeout signal', async () => {
    let fetchSignal: AbortSignal | undefined;
    global.fetch = vi.fn(async (_url, init) => {
      fetchSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        fetchSignal?.addEventListener('abort', () => reject(new Error('aborted')), {
          once: true,
        });
      });
    }) as unknown as typeof fetch;
    const controller = new AbortController();

    const request = httpRequest({
      url: 'https://provider.example/generate',
      allowedHosts: ALLOWED,
      method: 'POST',
      body: { prompt: 'hello' },
      timeoutMs: 30_000,
      signal: controller.signal,
    });
    await Promise.resolve();
    controller.abort();

    await expect(request).rejects.toThrow('aborted');
    expect(fetchSignal?.aborted).toBe(true);
  });
});

/**
 * The SSRF chokepoint (TD-038 / CodeQL js/request-forgery alert #58).
 *
 * Every exported function here hands a caller-supplied string to `fetch`, so
 * each one is asserted separately: a guard applied to three of four is not a
 * chokepoint. The three shapes below are refused BEFORE the host allowlist
 * runs, so they hold whether or not this test process has any `*_SERVICE_URL`
 * variables set — which is what makes them a stable assertion rather than one
 * that depends on the environment the suite happened to start with.
 */
describe('http client SSRF refusals', () => {
  const REFUSED_URLS: ReadonlyArray<readonly [string, string]> = [
    ['a file:// url', 'file:///etc/passwd'],
    ['a url with embedded credentials', 'https://user:pass@example.com/x'],
    ['the cloud metadata address', 'http://169.254.169.254/latest/meta-data'],
  ];

  let originalFetch: typeof fetch;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }));
    global.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe.each(REFUSED_URLS)('%s', (_label, url) => {
    it('httpRequest throws and never calls fetch', async () => {
      await expect(httpRequest({ url, method: 'GET' })).rejects.toThrow(/refusing/u);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('httpStream throws and never calls fetch', async () => {
      await expect(httpStream({ url, method: 'POST', body: {} })).rejects.toThrow(/refusing/u);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    // These two swallow every failure by contract (null / false rather than a
    // throw), so the observable refusal is "no request was made".
    it('httpReadBinaryBase64 returns null and never calls fetch', async () => {
      await expect(httpReadBinaryBase64({ url })).resolves.toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('httpStreamBinary returns false, writes nothing, and never calls fetch', async () => {
      const written: Buffer[] = [];
      let ended = false;
      const sink = {
        write: (chunk: Buffer): unknown => written.push(chunk),
        end: (): unknown => (ended = true),
      };

      await expect(httpStreamBinary({ url, sink })).resolves.toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(written).toHaveLength(0);
      expect(ended).toBe(false);
    });
  });
});

describe('httpPostBinary cancellation (Read aloud Stop)', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('aborts the local request when the caller signal fires', async () => {
    global.fetch = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('AbortError')), {
            once: true,
          });
        }),
    );
    const caller = new AbortController();
    const pending = httpPostBinary({
      url: 'https://provider.example/speech',
      body: { input: 'hi' },
      timeoutMs: 60_000,
      allowedHosts: ALLOWED,
      signal: caller.signal,
    });
    caller.abort();
    await expect(pending).rejects.toThrow('AbortError');
  });

  it('never sends when the caller signal is already aborted', async () => {
    let sentSignal: AbortSignal | null | undefined;
    global.fetch = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      sentSignal = init?.signal;
      throw new Error('AbortError');
    });
    const caller = new AbortController();
    caller.abort();
    await expect(
      httpPostBinary({
        url: 'https://provider.example/speech',
        body: {},
        timeoutMs: 60_000,
        allowedHosts: ALLOWED,
        signal: caller.signal,
      }),
    ).rejects.toThrow('AbortError');
    expect(sentSignal?.aborted).toBe(true);
  });
});
