import { ConnectorStatus, ModelLifecycle } from '../../../generated/prisma';
import { OllamaAdapter } from '../managers/adapters/ollama.adapter';
import { httpGet, httpGetText } from '../../../common/utilities/http.utility';

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({
      OLLAMA_BASE_URL: 'http://ollama:11434',
    }),
  },
}));

jest.mock('../../../common/utilities/http.utility', () => ({
  httpGet: jest.fn(),
  httpGetText: jest.fn(),
}));

const mockedHttpGet = httpGet as jest.MockedFunction<typeof httpGet>;
const mockedHttpGetText = httpGetText as jest.MockedFunction<typeof httpGetText>;

describe('OllamaAdapter', () => {
  let adapter: OllamaAdapter;

  beforeEach(() => {
    adapter = new OllamaAdapter();
    mockedHttpGet.mockReset();
    mockedHttpGetText.mockReset();
  });

  it('syncs cloud models from the Ollama public API and keeps exact tags from /api/tags', async () => {
    mockedHttpGet.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        models: [
          {
            name: 'glm-5.1',
            model: 'glm-5.1',
            modified_at: '2026-04-22T00:00:00Z',
            size: 2800000000,
            digest: 'sha256-glm51',
            details: {
              family: 'glm',
              parameter_size: '9B',
              quantization_level: 'Q4_K_M',
            },
          },
          {
            name: 'deepseek-v3.2',
            model: 'deepseek-v3.2',
            modified_at: '2026-04-22T00:00:00Z',
            size: 1200000000,
            digest: 'sha256-deepseek',
            details: {
              family: 'deepseek',
              parameter_size: '32B',
              quantization_level: 'Q4_K_M',
            },
          },
          {
            name: 'gemma4:31b',
            model: 'gemma4:31b',
            modified_at: '2026-04-22T00:00:00Z',
            size: 62000000000,
            digest: 'sha256-gemma4',
            details: {
              family: 'gemma4',
              parameter_size: '31B',
              quantization_level: 'Q4_K_M',
            },
          },
          {
            name: 'gpt-oss:120b-cloud',
            model: 'gpt-oss:120b-cloud',
            modified_at: '2026-04-22T00:00:00Z',
            size: 120000000000,
            digest: 'sha256-gptoss120',
            details: {
              family: 'gpt-oss',
              parameter_size: '120B',
              quantization_level: 'Q4_K_M',
            },
          },
          {
            name: 'gpt-oss:20b-cloud',
            model: 'gpt-oss:20b-cloud',
            modified_at: '2026-04-22T00:00:00Z',
            size: 20000000000,
            digest: 'sha256-gptoss20',
            details: {
              family: 'gpt-oss',
              parameter_size: '20B',
              quantization_level: 'Q4_K_M',
            },
          },
        ],
      },
    });
    mockedHttpGetText
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: '<a href="/library/glm-5.1">GLM</a><a href="/library/deepseek-v3.2">DeepSeek</a>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: '<a href="/library/gemma4">Gemma4</a><a href="/library/gpt-oss">GPT OSS</a>',
      });

    const result = await adapter.syncModels({
      provider: 'OLLAMA',
      apiKey: 'ollama-cloud-key',
      baseUrl: 'https://ollama.com/api',
    });

    expect(mockedHttpGet).toHaveBeenCalledTimes(1);
    expect(mockedHttpGet).toHaveBeenCalledWith({
      url: 'https://ollama.com/api/tags',
      headers: { Authorization: 'Bearer ollama-cloud-key' },
    });
    expect(mockedHttpGetText).toHaveBeenNthCalledWith(1, {
      url: 'https://ollama.com/search?c=cloud',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClawAI-ConnectorService/1.0; +https://ollama.com)',
      },
    });
    expect(mockedHttpGetText).toHaveBeenNthCalledWith(2, {
      url: 'https://ollama.com/library?sort=popular',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ClawAI-ConnectorService/1.0; +https://ollama.com)',
      },
    });
    expect(result).toHaveLength(5);
    expect(result.map((model) => model.modelKey)).toEqual([
      'glm-5.1',
      'deepseek-v3.2',
      'gemma4:31b',
      'gpt-oss:120b-cloud',
      'gpt-oss:20b-cloud',
    ]);
    expect(result.every((model) => model.lifecycle === ModelLifecycle.ACTIVE)).toBe(true);
    expect(result.find((model) => model.modelKey === 'gpt-oss:20b-cloud')?.usage).toEqual({
      tier: 'LOW',
      inputUsdPerMillion: null,
      cachedInputUsdPerMillion: null,
      outputUsdPerMillion: null,
    });
    expect(result.find((model) => model.modelKey === 'gpt-oss:120b-cloud')?.usage).toEqual({
      tier: 'MEDIUM',
      inputUsdPerMillion: null,
      cachedInputUsdPerMillion: null,
      outputUsdPerMillion: null,
    });
    expect(
      result.find((model) => model.modelKey === 'gemma4:31b')?.capabilities.maxContextTokens,
    ).toBe(256_000);
  });

  it('reports health from the Ollama public API', async () => {
    mockedHttpGet.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: {
        models: [],
      },
    });

    const result = await adapter.healthCheck({
      provider: 'OLLAMA',
      apiKey: 'ollama-cloud-key',
      baseUrl: 'https://ollama.com/api',
    });

    expect(result.status).toBe(ConnectorStatus.HEALTHY);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
