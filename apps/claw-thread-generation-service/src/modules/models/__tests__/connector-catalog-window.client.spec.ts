import { AppConfig } from '../../../app/config/app.config';
import {
  CONNECTOR_CATALOG_RETRY_AFTER_FAILURE_MS,
  MODEL_WINDOW_CACHE_TTL_MS,
} from '../constants/model-context.constants';
import { ConnectorCatalogWindowClient } from '../connector-catalog-window.client';

const CATALOG = {
  providers: [
    {
      provider: 'GROQ',
      models: [
        { modelKey: 'openai/gpt-oss-120b', maxContextTokens: 131_072 },
        { modelKey: 'no-window-model', maxContextTokens: null },
      ],
    },
    {
      provider: 'OPENROUTER',
      models: [{ modelKey: 'mistralai/mistral-small-2603', maxContextTokens: 262_144 }],
    },
  ],
};

function catalogResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('ConnectorCatalogWindowClient', () => {
  beforeEach(() => {
    vi.stubEnv('THREAD_GENERATION_DATABASE_URL', 'postgresql://claw:secret@localhost:5432/db');
    vi.stubEnv('JWT_SECRET', 'x'.repeat(32));
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(40));
    vi.stubEnv('CONNECTOR_SERVICE_URL', 'http://connector-service:4003');
    AppConfig.validate();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reads the windows the picker shows and sends the service token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(catalogResponse(CATALOG));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ConnectorCatalogWindowClient();

    expect(await client.findWindow('GROQ', 'openai/gpt-oss-120b')).toBe(131_072);
    expect(await client.findWindow('openrouter', 'mistralai/mistral-small-2603')).toBe(262_144);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      'http://connector-service:4003/api/v1/internal/connectors/public-catalog',
    );
    expect(init?.headers).toEqual({ Authorization: `Service ${'t'.repeat(40)}` });
  });

  it('states nothing for a model with a null window or one that is not listed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(catalogResponse(CATALOG)));
    const client = new ConnectorCatalogWindowClient();

    expect(await client.findWindow('GROQ', 'no-window-model')).toBeUndefined();
    expect(await client.findWindow('GROQ', 'unlisted')).toBeUndefined();
    expect(await client.findWindow('OLLAMA', 'openai/gpt-oss-120b')).toBeUndefined();
  });

  it('reads the catalog once for many lookups, including concurrent ones', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(catalogResponse(CATALOG)));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ConnectorCatalogWindowClient();

    await Promise.all([
      client.findWindow('GROQ', 'openai/gpt-oss-120b'),
      client.findWindow('OPENROUTER', 'mistralai/mistral-small-2603'),
    ]);
    await client.findWindow('GROQ', 'openai/gpt-oss-120b');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads the catalog again once the index is older than the TTL', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(catalogResponse(CATALOG)));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ConnectorCatalogWindowClient();

    await client.findWindow('GROQ', 'openai/gpt-oss-120b');
    vi.advanceTimersByTime(MODEL_WINDOW_CACHE_TTL_MS - 1);
    await client.findWindow('GROQ', 'openai/gpt-oss-120b');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2);
    await client.findWindow('GROQ', 'openai/gpt-oss-120b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['a network error', () => Promise.reject(new Error('ECONNREFUSED'))],
    ['a 503', () => Promise.resolve(catalogResponse({}, 503))],
    ['a 401', () => Promise.resolve(catalogResponse({}, 401))],
    ['a body that is not the catalog shape', () => Promise.resolve(catalogResponse({ nope: 1 }))],
    ['a body that is not JSON', () => Promise.resolve(new Response('<html>', { status: 200 }))],
  ])('fails open on %s', async (_label, respond) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(respond));

    expect(await new ConnectorCatalogWindowClient().findWindow('GROQ', 'x')).toBeUndefined();
  });

  it('does not hammer a failing catalog and retries after the back-off', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(catalogResponse({}, 503))
      .mockResolvedValue(catalogResponse(CATALOG));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ConnectorCatalogWindowClient();

    expect(await client.findWindow('GROQ', 'openai/gpt-oss-120b')).toBeUndefined();
    expect(await client.findWindow('GROQ', 'openai/gpt-oss-120b')).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(CONNECTOR_CATALOG_RETRY_AFTER_FAILURE_MS + 1);
    expect(await client.findWindow('GROQ', 'openai/gpt-oss-120b')).toBe(131_072);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails open when the configured URL is refused by the request guard', async () => {
    vi.stubEnv('CONNECTOR_SERVICE_URL', 'ftp://connector-service:4003');
    AppConfig.validate();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await new ConnectorCatalogWindowClient().findWindow('GROQ', 'x')).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
