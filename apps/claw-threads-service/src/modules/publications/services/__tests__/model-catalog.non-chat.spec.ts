import { AppConfig } from '../../../../app/config/app.config';
import { ModelCatalogClient } from '../model-catalog.client';

describe('ModelCatalogClient keeps non-chat and removed models out of the Threads picker', () => {
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

  it('drops image, video, embedding and speech names and flagged rows', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        providers: [
          {
            provider: 'grok',
            models: [
              { modelKey: 'grok-4.3' },
              { modelKey: 'grok-imagine-image' },
              { modelKey: 'grok-imagine-video-1' },
            ],
          },
          {
            provider: 'gemini',
            models: [
              { modelKey: 'gemini-2.5-flash' },
              { modelKey: 'gemini-2.5-flash-image' },
              { modelKey: 'text-embedding-004' },
              { modelKey: 'gemini-2.5-flash-preview-tts' },
              { modelKey: 'veo-3' },
              { modelKey: 'imagination-chat' },
            ],
          },
          {
            provider: 'pollinations',
            models: [
              { modelKey: 'openai-fast', lifecycle: 'REMOVED' },
              { modelKey: 'openai-large', exposure: 'UNEXPOSED' },
              { modelKey: 'openai-audio', kind: 'AUDIO' },
              { modelKey: 'openai-chat', kind: 'CHAT', lifecycle: 'ACTIVE', exposure: 'EXPOSED' },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetch);
    const client = new ModelCatalogClient();

    const kept = (await client.listModels()).map(({ provider, model }) => `${provider}/${model}`);

    expect(kept).toEqual([
      'GROK/grok-4.3',
      'GEMINI/gemini-2.5-flash',
      'GEMINI/imagination-chat',
      'POLLINATIONS/openai-chat',
    ]);
    await expect(client.isKnown({ provider: 'GROK', model: 'grok-imagine-image' })).resolves.toBe(
      false,
    );
  });
});
