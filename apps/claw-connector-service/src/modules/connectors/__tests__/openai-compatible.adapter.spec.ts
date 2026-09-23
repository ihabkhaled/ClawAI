import { vi } from 'vitest';
import { getConnectorPreset } from '@claw/shared-utilities';
import { ConnectorProvider, ConnectorStatus, ModelLifecycle } from '../../../generated/prisma';
import { getAdapter } from '../managers/adapters/adapter-factory';
import { OpenAICompatibleAdapter } from '../managers/adapters/openai-compatible.adapter';
import { type ConnectorConfig, type ProviderAdapter } from '../managers/provider-adapter.interface';

vi.mock('../../../app/config/app.config', () => ({
  AppConfig: { get: vi.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }) },
}));

const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';

function adapterFor(provider: string): OpenAICompatibleAdapter {
  const preset = getConnectorPreset(provider);
  if (preset === undefined) {
    throw new Error(`no preset ${provider}`);
  }
  return new OpenAICompatibleAdapter(preset);
}

function config(provider: string, overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
  return { provider, apiKey: 'test-key', ...overrides };
}

function mockFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  });
  global.fetch = fetchMock;
  return fetchMock;
}

function calledUrl(fetchMock: ReturnType<typeof vi.fn>, call = 0): string {
  const args = fetchMock.mock.calls[call] as [URL, RequestInit];
  return String(args[0]);
}

function calledInit(fetchMock: ReturnType<typeof vi.fn>, call = 0): RequestInit {
  const args = fetchMock.mock.calls[call] as [URL, RequestInit];
  return args[1];
}

describe('adapter factory', () => {
  it.each([
    ConnectorProvider.OPENROUTER,
    ConnectorProvider.GROQ,
    ConnectorProvider.CEREBRAS,
    ConnectorProvider.SAMBANOVA,
    ConnectorProvider.DEEPINFRA,
    ConnectorProvider.FIREWORKS,
    ConnectorProvider.TOGETHER,
    ConnectorProvider.MISTRAL,
    ConnectorProvider.MOONSHOT,
    ConnectorProvider.ZAI,
    ConnectorProvider.QWEN,
    ConnectorProvider.CLOUDFLARE,
    ConnectorProvider.VERCEL_AI_GATEWAY,
    ConnectorProvider.PERPLEXITY,
    ConnectorProvider.COHERE,
  ])('serves %s through the generic OpenAI-compatible adapter', (provider) => {
    expect(getAdapter(provider)).toBeInstanceOf(OpenAICompatibleAdapter);
  });

  it('keeps the bespoke adapters for the original providers', () => {
    expect(getAdapter(ConnectorProvider.DEEPSEEK)).not.toBeInstanceOf(OpenAICompatibleAdapter);
    expect(getAdapter(ConnectorProvider.GROK)).not.toBeInstanceOf(OpenAICompatibleAdapter);
  });
});

describe('OpenAICompatibleAdapter.healthCheck', () => {
  it('is HEALTHY when the key-scoped endpoint answers 2xx, with a Bearer key', async () => {
    const fetchMock = mockFetch(200, { data: [] });

    const result = await adapterFor('GROQ').healthCheck(config('GROQ'));

    expect(result.status).toBe(ConnectorStatus.HEALTHY);
    expect(calledUrl(fetchMock)).toBe('https://api.groq.com/openai/v1/models');
    expect(calledInit(fetchMock).headers).toEqual({ Authorization: 'Bearer test-key' });
    expect(calledInit(fetchMock).redirect).toBe('error');
  });

  it('checks OpenRouter against its key endpoint, not the public model list', async () => {
    const fetchMock = mockFetch(200, { data: { label: 'k' } });

    await adapterFor('OPENROUTER').healthCheck(config('OPENROUTER'));

    expect(calledUrl(fetchMock)).toBe('https://openrouter.ai/api/v1/key');
  });

  it('is DOWN with the provider name and status on a refused key', async () => {
    mockFetch(401, { error: { message: 'Invalid API Key' } });

    const result = await adapterFor('MISTRAL').healthCheck(config('MISTRAL'));

    expect(result.status).toBe(ConnectorStatus.DOWN);
    expect(result.errorMessage).toBe('Mistral AI API returned status 401');
  });

  it('is DOWN, not thrown, when the provider answers 401 with plain text', async () => {
    mockFetch(401, 'Missing API key');

    const result = await adapterFor('TOGETHER').healthCheck(config('TOGETHER'));

    expect(result.status).toBe(ConnectorStatus.DOWN);
    expect(result.errorMessage).toContain('non-JSON body');
  });

  it('is DOWN when the network fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await adapterFor('CEREBRAS').healthCheck(config('CEREBRAS'));

    expect(result.status).toBe(ConnectorStatus.DOWN);
    expect(result.errorMessage).toBe('ECONNREFUSED');
  });

  it('probes Perplexity with a one-token completion, since it has no key-scoped GET', async () => {
    const fetchMock = mockFetch(200, { choices: [] });

    const result = await adapterFor('PERPLEXITY').healthCheck(config('PERPLEXITY'));

    expect(result.status).toBe(ConnectorStatus.HEALTHY);
    expect(calledUrl(fetchMock)).toBe('https://api.perplexity.ai/chat/completions');
    const init = calledInit(fetchMock);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'sonar',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    });
  });

  it('substitutes the Cloudflare account id into the health URL', async () => {
    const fetchMock = mockFetch(200, { success: true, result: [] });

    await adapterFor('CLOUDFLARE').healthCheck(config('CLOUDFLARE', { accountId: ACCOUNT_ID }));

    expect(calledUrl(fetchMock)).toBe(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/models/search?per_page=1`,
    );
  });

  it('is DOWN without calling out when a Cloudflare connector has no account id', async () => {
    const fetchMock = mockFetch(200, {});

    const result = await adapterFor('CLOUDFLARE').healthCheck(config('CLOUDFLARE'));

    expect(result.status).toBe(ConnectorStatus.DOWN);
    expect(result.errorMessage).toContain('account ID');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends no Authorization header when the connector has no key', async () => {
    const fetchMock = mockFetch(401, { error: 'no key' });

    const result = await adapterFor('GROQ').healthCheck(config('GROQ', { apiKey: '' }));

    expect(result.status).toBe(ConnectorStatus.DOWN);
    expect(calledInit(fetchMock).headers).toEqual({});
  });

  it('follows an administrator-edited base URL', async () => {
    const fetchMock = mockFetch(200, { data: [] });

    await adapterFor('MOONSHOT').healthCheck(
      config('MOONSHOT', { baseUrl: 'https://api.moonshot.cn/v1' }),
    );

    expect(calledUrl(fetchMock)).toBe('https://api.moonshot.cn/v1/models');
  });
});

describe('OpenAICompatibleAdapter.syncModels', () => {
  it('keeps only chat models from an OpenAI-shaped list and reads reported windows', async () => {
    mockFetch(200, {
      object: 'list',
      data: [
        { id: 'llama-3.3-70b-versatile', object: 'model', context_window: 131_072 },
        { id: 'whisper-large-v3', object: 'model' },
        { id: 'meta-llama/llama-guard-4-12b', object: 'model' },
      ],
    });

    const models = await adapterFor('GROQ').syncModels(config('GROQ'));

    expect(models.map((model) => model.modelKey)).toEqual(['llama-3.3-70b-versatile']);
    expect(models[0]?.capabilities.maxContextTokens).toBe(131_072);
    expect(models[0]?.capabilities.supportsStreaming).toBe(true);
    expect(models[0]?.lifecycle).toBe(ModelLifecycle.ACTIVE);
  });

  it('parses Together’s bare array and drops non-chat types', async () => {
    mockFetch(200, [
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        type: 'chat',
        display_name: 'Llama 3.3 70B',
      },
      { id: 'BAAI/bge-large-en-v1.5', type: 'embedding' },
      { id: 'black-forest-labs/FLUX.1-schnell', type: 'image' },
    ]);

    const models = await adapterFor('TOGETHER').syncModels(config('TOGETHER'));

    expect(models).toHaveLength(1);
    expect(models[0]?.displayName).toBe('Llama 3.3 70B');
  });

  it('reads OpenRouter’s modalities and parameters for vision and tools', async () => {
    const fetchMock = mockFetch(200, {
      data: [
        {
          id: 'openai/gpt-4o',
          name: 'OpenAI: GPT-4o',
          context_length: 128_000,
          architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
          supported_parameters: ['tools', 'tool_choice'],
        },
        {
          id: 'some/text-model',
          name: 'Text Model',
          architecture: { input_modalities: ['text'], output_modalities: ['text'] },
          supported_parameters: ['temperature'],
        },
      ],
    });

    const models = await adapterFor('OPENROUTER').syncModels(config('OPENROUTER'));

    expect(calledUrl(fetchMock)).toBe('https://openrouter.ai/api/v1/models');
    expect(models[0]?.capabilities).toMatchObject({
      supportsVision: true,
      supportsTools: true,
      maxContextTokens: 128_000,
    });
    expect(models[1]?.capabilities).toMatchObject({ supportsVision: false, supportsTools: false });
  });

  it('reads Mistral’s capability flags', async () => {
    mockFetch(200, {
      data: [
        {
          id: 'pixtral-large-latest',
          capabilities: { completion_chat: true, function_calling: true, vision: true },
        },
        { id: 'mistral-embed', capabilities: { completion_chat: false } },
      ],
    });

    const models = await adapterFor('MISTRAL').syncModels(config('MISTRAL'));

    expect(models).toHaveLength(1);
    expect(models[0]?.capabilities).toMatchObject({ supportsVision: true, supportsTools: true });
  });

  it('reads Cohere’s native list and keeps chat-endpoint models', async () => {
    const fetchMock = mockFetch(200, {
      models: [
        {
          name: 'command-a-vision-07-2025',
          endpoints: ['chat'],
          features: ['vision', 'tools'],
          context_length: 128_000,
        },
        { name: 'embed-v4.0', endpoints: ['embed'] },
        { name: 'command-r', endpoints: ['chat'], is_deprecated: true },
      ],
    });

    const models = await adapterFor('COHERE').syncModels(config('COHERE'));

    expect(calledUrl(fetchMock)).toBe(
      'https://api.cohere.com/v1/models?endpoint=chat&page_size=1000',
    );
    expect(models.map((model) => model.modelKey)).toEqual([
      'command-a-vision-07-2025',
      'command-r',
    ]);
    expect(models[0]?.capabilities).toMatchObject({ supportsVision: true, supportsTools: true });
    expect(models[1]?.lifecycle).toBe(ModelLifecycle.DEPRECATED);
  });

  it('reads Cloudflare’s search result for the account and keeps text generation', async () => {
    const fetchMock = mockFetch(200, {
      success: true,
      result: [
        { name: '@cf/meta/llama-3.1-8b-instruct', task: { name: 'Text Generation' } },
        { name: '@cf/baai/bge-large-en-v1.5', task: { name: 'Text Embeddings' } },
      ],
    });

    const models = await adapterFor('CLOUDFLARE').syncModels(
      config('CLOUDFLARE', { accountId: ACCOUNT_ID }),
    );

    expect(calledUrl(fetchMock)).toContain(`/accounts/${ACCOUNT_ID}/ai/models/search`);
    expect(models.map((model) => model.modelKey)).toEqual(['@cf/meta/llama-3.1-8b-instruct']);
    // Workers AI tool support is unproven per model, so it is never claimed.
    expect(models[0]?.capabilities.supportsTools).toBe(false);
  });

  it('falls back to the documented catalogue when the preset has no list endpoint', async () => {
    const fetchMock = mockFetch(200, {});

    const models = await adapterFor('PERPLEXITY').syncModels(config('PERPLEXITY'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(models.map((model) => model.modelKey)).toEqual([
      'sonar',
      'sonar-pro',
      'sonar-reasoning-pro',
      'sonar-deep-research',
    ]);
    expect(models.every((model) => !model.capabilities.supportsTools)).toBe(true);
  });

  it('uses the Z.ai documented catalogue', async () => {
    const models = await adapterFor('ZAI').syncModels(config('ZAI'));

    expect(models.map((model) => model.modelKey)).toContain('glm-4.6');
    expect(models.every((model) => model.lifecycle === ModelLifecycle.ACTIVE)).toBe(true);
  });

  it('throws on a non-2xx list so the sync run is recorded as FAILED', async () => {
    mockFetch(500, { error: 'boom' });

    await expect(adapterFor('FIREWORKS').syncModels(config('FIREWORKS'))).rejects.toThrow(
      'Failed to fetch Fireworks AI models: HTTP 500',
    );
  });

  it('throws on an unexpected envelope instead of reporting zero models', async () => {
    mockFetch(200, { models: [] });

    await expect(adapterFor('DEEPINFRA').syncModels(config('DEEPINFRA'))).rejects.toThrow(
      'unexpected shape',
    );
  });

  it('skips a malformed entry and keeps the rest', async () => {
    mockFetch(200, { data: [{ id: '' }, { nope: true }, { id: 'qwen-max' }] });

    const models = await adapterFor('QWEN').syncModels(config('QWEN'));

    expect(models.map((model) => model.modelKey)).toEqual(['qwen-max']);
  });
});

describe('OpenAICompatibleAdapter.getCapabilities', () => {
  it('claims tools only where the preset allows native tools', () => {
    expect(adapterFor('GROQ').getCapabilities().supportsTools).toBe(true);
    expect(adapterFor('PERPLEXITY').getCapabilities().supportsTools).toBe(false);
  });

  it('claims vision at provider level only where the preset names vision SKUs', () => {
    expect(adapterFor('QWEN').getCapabilities().supportsVision).toBe(true);
    expect(adapterFor('GROQ').getCapabilities().supportsVision).toBe(false);
  });

  it('does not offer a behavioural tool probe', () => {
    const adapter: ProviderAdapter = adapterFor('GROQ');
    expect(adapter.probeToolCapability).toBeUndefined();
  });
});
