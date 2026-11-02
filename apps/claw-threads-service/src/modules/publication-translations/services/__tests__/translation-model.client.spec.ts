import { vi } from 'vitest';

import { TranslationModelClient, TranslationModelError } from '../translation-model.client';

const config = { apiKey: 'k', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' };

function reply(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

describe('TranslationModelClient', () => {
  beforeEach(() => {
    vi.stubEnv('THREADS_DATABASE_URL', 'postgresql://x');
    vi.stubEnv('RABBITMQ_URL', 'amqp://x');
    vi.stubEnv('AUTH_SERVICE_URL', 'https://auth-service:4001');
    vi.stubEnv('THREAD_GENERATION_SERVICE_URL', 'https://thread-generation-service:4020');
    vi.stubEnv('INTER_SERVICE_AUTH_TOKEN', 'x'.repeat(40));
    vi.stubEnv('JWT_SECRET', 'y'.repeat(40));
    vi.stubEnv('CONNECTOR_SERVICE_URL', 'https://connector-service:4003');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the first model that answers, over the OpenAI-compatible surface', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(config))
      .mockResolvedValueOnce(reply({ choices: [{ message: { content: 'hola' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new TranslationModelClient().complete('sys', 'prompt');

    expect(result).toEqual({ content: 'hola', model: 'GEMINI:gemma-4-31b-it' });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    );
  });

  it('falls through to the next models on an error and reaches Ollama native chat', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(config))
      .mockResolvedValueOnce(reply({}, false, 429))
      .mockResolvedValueOnce(reply({}, false, 503))
      .mockResolvedValueOnce(reply({ apiKey: 'o', baseUrl: 'https://ollama.com' }))
      .mockResolvedValueOnce(reply({ message: { content: 'bonjour' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new TranslationModelClient().complete('sys', 'prompt');

    expect(result).toEqual({ content: 'bonjour', model: 'OLLAMA:gpt-oss:120b' });
    expect(fetchMock.mock.calls[4]?.[0]).toBe('https://ollama.com/api/chat');
  });

  it('fails with a stable code when every model fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply({}, false, 500)));

    await expect(new TranslationModelClient().complete('sys', 'prompt')).rejects.toBeInstanceOf(
      TranslationModelError,
    );
  });
});
