import { AppConfig } from '../../../app/config/app.config';
import { DeterministicGenerationError } from '../../generation/utilities/deterministic-generation.error';
import {
  MODEL_WINDOW_CACHE_MAX_ENTRIES,
  MODEL_WINDOW_CACHE_TTL_MS,
  THREADS_ASSUMED_WINDOW_TOKENS,
} from '../constants/model-context.constants';
import { ModelContextClient } from '../model-context.client';

function windowResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

async function failureOf(attempt: Promise<unknown>): Promise<Error> {
  try {
    await attempt;
  } catch (error: unknown) {
    if (error instanceof Error) return error;
  }
  throw new Error('Expected the lookup to fail');
}

describe('ModelContextClient', () => {
  beforeEach(() => {
    vi.stubEnv('THREAD_GENERATION_DATABASE_URL', 'postgresql://claw:secret@localhost:5432/db');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    vi.stubEnv('ROUTING_SERVICE_URL', 'http://routing-service:4004');
    AppConfig.validate();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns the catalog window as known and sends the service token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(windowResponse({ contextWindowTokens: 200_000 }));
    vi.stubGlobal('fetch', fetchMock);

    const window = await new ModelContextClient().getWindow('ANTHROPIC', 'claude-x');

    expect(window).toEqual({ tokens: 200_000, source: 'known' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      'http://routing-service:4004/api/v1/internal/router-models/context-window/ANTHROPIC/claude-x',
    );
    expect(init?.headers).toEqual({ Authorization: `Service ${'t'.repeat(40)}` });
  });

  it('assumes the conservative default when the catalog has no window', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(windowResponse({ contextWindowTokens: null })),
    );

    const window = await new ModelContextClient().getWindow('OLLAMA', 'glm-5.3');

    expect(window).toEqual({ tokens: THREADS_ASSUMED_WINDOW_TOKENS, source: 'assumed' });
    expect(THREADS_ASSUMED_WINDOW_TOKENS).toBe(32_768);
  });

  it('falls back to the shared table before assuming, when the catalog has no window', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(windowResponse({ contextWindowTokens: null })),
    );

    const window = await new ModelContextClient().getWindow('GROQ', 'openai/gpt-oss-120b');

    expect(window).toEqual({ tokens: 131_072, source: 'known' });
  });

  it('treats a body that is not the expected shape as an unknown window', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(windowResponse({ contextWindowTokens: 'x' })));

    const window = await new ModelContextClient().getWindow('OLLAMA', 'glm-5.3');

    expect(window.source).toBe('assumed');
  });

  it('treats a body that is not JSON as an unknown window', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));

    const window = await new ModelContextClient().getWindow('OLLAMA', 'glm-5.3');

    expect(window).toEqual({ tokens: THREADS_ASSUMED_WINDOW_TOKENS, source: 'assumed' });
  });

  it('reports an unreachable catalog when the request itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const failure = await failureOf(new ModelContextClient().getWindow('OPENAI', 'gpt-5'));

    expect(failure).toBeInstanceOf(Error);
    expect(failure.message).toBe('Model catalog is unreachable');
    expect(failure).not.toBeInstanceOf(DeterministicGenerationError);
  });

  it.each([500, 502, 503, 408, 425, 429])(
    'keeps a %d from the catalog retryable as unreachable',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(windowResponse({}, status)));

      const failure = await failureOf(new ModelContextClient().getWindow('OPENAI', 'gpt-5'));

      expect(failure.message).toBe('Model catalog is unreachable');
      expect(failure).not.toBeInstanceOf(DeterministicGenerationError);
    },
  );

  it.each([400, 401, 403, 404])(
    'treats a %d from the catalog as a rejected lookup that retrying cannot fix',
    async (status) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(windowResponse({}, status)));

      const failure = await failureOf(new ModelContextClient().getWindow('OPENAI', 'gpt-5'));

      expect(failure).toBeInstanceOf(DeterministicGenerationError);
      expect(failure.message).toBe(`Model catalog rejected the lookup (${String(status)})`);
    },
  );

  it('reuses a looked-up window instead of asking again, per provider and model', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(windowResponse({ contextWindowTokens: 64_000 })));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ModelContextClient();

    await client.getWindow('OPENAI', 'gpt-5');
    await client.getWindow('openai', 'gpt-5');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await client.getWindow('OPENAI', 'gpt-5-mini');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('caches an assumed window too, so a null catalog row is asked about once', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(windowResponse({ contextWindowTokens: null })));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ModelContextClient();

    await client.getWindow('OLLAMA', 'glm-5.3');
    const again = await client.getWindow('OLLAMA', 'glm-5.3');

    expect(again.source).toBe('assumed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('asks again once the cached window is older than the TTL', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(windowResponse({ contextWindowTokens: 64_000 })));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ModelContextClient();

    await client.getWindow('OPENAI', 'gpt-5');
    vi.advanceTimersByTime(MODEL_WINDOW_CACHE_TTL_MS - 1);
    await client.getWindow('OPENAI', 'gpt-5');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.getWindow('OPENAI', 'gpt-5');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('never caches a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(windowResponse({}, 503))
      .mockResolvedValueOnce(windowResponse({ contextWindowTokens: 64_000 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ModelContextClient();

    await expect(client.getWindow('OPENAI', 'gpt-5')).rejects.toThrow('unreachable');
    const window = await client.getWindow('OPENAI', 'gpt-5');

    expect(window.tokens).toBe(64_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the cache bounded by dropping the oldest entry', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(windowResponse({ contextWindowTokens: 64_000 })));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ModelContextClient();

    for (let index = 0; index <= MODEL_WINDOW_CACHE_MAX_ENTRIES; index += 1) {
      await client.getWindow('OPENAI', `model-${String(index)}`);
    }
    const calls = fetchMock.mock.calls.length;
    await client.getWindow('OPENAI', `model-${String(MODEL_WINDOW_CACHE_MAX_ENTRIES)}`);
    expect(fetchMock).toHaveBeenCalledTimes(calls);
    await client.getWindow('OPENAI', 'model-0');
    expect(fetchMock).toHaveBeenCalledTimes(calls + 1);
  });
});
