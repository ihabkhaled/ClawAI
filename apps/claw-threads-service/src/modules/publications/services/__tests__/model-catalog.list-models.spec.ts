import { AppConfig } from '../../../../app/config/app.config';
import { ModelCatalogClient } from '../model-catalog.client';

describe('ModelCatalogClient.listModels', () => {
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
  });

  it('returns provider, bare model id, window and cost band from the one cached read', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: 'gemini',
            models: [
              {
                modelKey: 'models/gemini-2.5-flash',
                maxContextTokens: 1_048_576,
                usageTier: 'LOW',
              },
              { modelKey: 'gemini-x' },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetch);
    const client = new ModelCatalogClient();

    await expect(client.listModels()).resolves.toEqual([
      { provider: 'GEMINI', model: 'gemini-2.5-flash', windowTokens: 1_048_576, usageTier: 'LOW' },
      { provider: 'GEMINI', model: 'gemini-x', windowTokens: null, usageTier: null },
    ]);
    await expect(client.isKnown({ provider: 'GEMINI', model: 'gemini-x' })).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
