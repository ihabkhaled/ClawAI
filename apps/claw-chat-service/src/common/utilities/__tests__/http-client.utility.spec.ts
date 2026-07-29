import { httpRequest } from '../http-client.utility';

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
    global.fetch = jest.fn(async (_url, init) => {
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
