import { ServiceUnavailableException } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import { ModelCatalogClient } from '../model-catalog.client';

describe('ModelCatalogClient', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', 'j'.repeat(32));
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://threads:secret@localhost:5432/threads');
    vi.stubEnv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('ROUTING_SERVICE_URL', 'https://routing-service:4004');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 't'.repeat(32));
    AppConfig.validate();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function stubFetch(response: { ok: boolean; json?: () => Promise<unknown> }) {
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('reads the catalog with the service token and never calls a model', async () => {
    const fetch = stubFetch({
      ok: true,
      json: async () => ({ known: true, contextWindowTokens: 1 }),
    });

    await expect(
      new ModelCatalogClient().isKnown({ provider: 'OLLAMA', model: 'gpt-oss:20b' }),
    ).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'https://routing-service:4004/api/v1/internal/router-models/context-window/OLLAMA/gpt-oss%3A20b',
      expect.objectContaining({
        redirect: 'error',
        headers: { Authorization: `Service ${'t'.repeat(32)}` },
      }),
    );
  });

  it('reports an unknown model as not known', async () => {
    stubFetch({ ok: true, json: async () => ({ known: false }) });

    await expect(
      new ModelCatalogClient().isKnown({ provider: 'OPENAI', model: 'no-such-model' }),
    ).resolves.toBe(false);
  });

  it.each([
    [
      'an unreachable catalog',
      () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down'))),
    ],
    ['a failing catalog', () => stubFetch({ ok: false })],
    ['a malformed answer', () => stubFetch({ ok: true, json: async () => ({ known: 'yes' }) })],
    [
      'an unreadable answer',
      () => stubFetch({ ok: true, json: async () => Promise.reject(new Error('bad json')) }),
    ],
  ])('fails closed with 503 on %s', async (_label, arrange) => {
    arrange();

    await expect(
      new ModelCatalogClient().isKnown({ provider: 'OLLAMA', model: 'm' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
