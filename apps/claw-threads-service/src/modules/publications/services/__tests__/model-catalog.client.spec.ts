import { ServiceUnavailableException } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import { ModelCatalogClient } from '../model-catalog.client';

const catalog = {
  providers: [
    {
      provider: 'GEMINI',
      models: [{ modelKey: 'gemini-2.5-flash' }, { modelKey: 'models/gemini-2.5-pro' }],
    },
    { provider: 'OLLAMA', models: [{ modelKey: 'gpt-oss:20b' }] },
  ],
};

describe('ModelCatalogClient', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(32));
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://threads:secret@localhost:5432/threads');
    vi.stubEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('CONNECTOR_SERVICE_URL', 'https://connector-service:4003');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(32));
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function stubFetch(response: { ok: boolean; json?: () => Promise<unknown> }) {
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  const okCatalog = () => stubFetch({ ok: true, json: async () => catalog });

  it('reads the picker catalog with the service token and never calls a model', async () => {
    const fetch = okCatalog();

    await expect(
      new ModelCatalogClient().isKnown({ provider: 'OLLAMA', model: 'gpt-oss:20b' }),
    ).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://connector-service:4003/api/v1/internal/connectors/public-catalog',
      expect.objectContaining({
        redirect: 'error',
        headers: { Authorization: `Service ${'t'.repeat(32)}` },
      }),
    );
  });

  it('rejects a name that only fits a family pattern (the gemini-nope-9 defect, D-07)', async () => {
    okCatalog();
    const client = new ModelCatalogClient();

    await expect(client.isKnown({ provider: 'GEMINI', model: 'gemini-nope-9' })).resolves.toBe(
      false,
    );
    await expect(
      client.isKnown({ provider: 'GEMINI', model: 'models/gemini-nope-9' }),
    ).resolves.toBe(false);
    await expect(client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-flash-x' })).resolves.toBe(
      false,
    );
  });

  it('matches the provider case-insensitively and the model exactly', async () => {
    okCatalog();
    const client = new ModelCatalogClient();

    await expect(client.isKnown({ provider: 'gemini', model: 'gemini-2.5-flash' })).resolves.toBe(
      true,
    );
    await expect(client.isKnown({ provider: 'GEMINI', model: 'GEMINI-2.5-FLASH' })).resolves.toBe(
      false,
    );
    await expect(client.isKnown({ provider: 'OPENAI', model: 'gemini-2.5-flash' })).resolves.toBe(
      false,
    );
  });

  it('treats the Gemini models/ prefix as decoration on either side', async () => {
    okCatalog();
    const client = new ModelCatalogClient();

    await expect(
      client.isKnown({ provider: 'GEMINI', model: 'models/gemini-2.5-flash' }),
    ).resolves.toBe(true);
    await expect(client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-pro' })).resolves.toBe(
      true,
    );
  });

  it('reads the catalog once for many concurrent lookups', async () => {
    const fetch = okCatalog();
    const client = new ModelCatalogClient();

    await Promise.all([
      client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-flash' }),
      client.isKnown({ provider: 'OLLAMA', model: 'gpt-oss:20b' }),
      client.isKnown({ provider: 'GEMINI', model: 'nope' }),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reads it again after the cache lifetime', async () => {
    vi.useFakeTimers();
    const fetch = okCatalog();
    const client = new ModelCatalogClient();

    await client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-flash' });
    await client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-flash' });
    expect(fetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(31_000);
    await client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-flash' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not remember a failed read: the next lookup tries again', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => catalog });
    vi.stubGlobal('fetch', fetch);
    const client = new ModelCatalogClient();

    await expect(
      client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-flash' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client.isKnown({ provider: 'GEMINI', model: 'gemini-2.5-flash' })).resolves.toBe(
      true,
    );
  });

  it.each([
    [
      'an unreachable catalog',
      () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down'))),
    ],
    ['a failing catalog', () => stubFetch({ ok: false })],
    [
      'an answer that is not JSON',
      () =>
        stubFetch({
          ok: true,
          json: async () => {
            throw new Error('not json');
          },
        }),
    ],
    ['an answer of the wrong shape', () => stubFetch({ ok: true, json: async () => ({}) })],
  ])('fails closed with 503 for %s', async (_name, arrange) => {
    arrange();

    await expect(
      new ModelCatalogClient().isKnown({ provider: 'OPENAI', model: 'gpt-5' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
