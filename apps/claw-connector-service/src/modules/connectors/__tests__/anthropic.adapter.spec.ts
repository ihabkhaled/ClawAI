import { ConnectorStatus, ModelLifecycle } from '../../../generated/prisma';
import { AnthropicAdapter } from '../managers/adapters/anthropic.adapter';
import { ANTHROPIC_DEFAULT_BASE_URL, ANTHROPIC_VERSION } from '../constants/anthropic.constants';

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }),
  },
}));

const mockConfig = {
  provider: 'ANTHROPIC',
  apiKey: 'sk-ant-test-key',
  baseUrl: undefined,
  region: undefined,
};

const mockModelsResponse = {
  data: [
    {
      type: 'model',
      id: 'claude-opus-4-1',
      display_name: 'Claude Opus 4.1',
      created_at: '2025-08-05T00:00:00Z',
    },
    {
      type: 'model',
      id: 'claude-sonnet-4-0',
      display_name: '',
      created_at: '2025-05-22T00:00:00Z',
    },
  ],
  has_more: false,
  first_id: null,
  last_id: null,
};

function mockFetchOk(body: unknown): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(status: number): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

function lastRequestHeaders(): Record<string, string> {
  const call = (global.fetch as jest.Mock).mock.calls[0] as [
    string,
    { headers: Record<string, string> },
  ];
  return call[1].headers;
}

describe('AnthropicAdapter', () => {
  let adapter: AnthropicAdapter;

  beforeEach(() => {
    adapter = new AnthropicAdapter();
  });

  // --- the header that broke every call ---

  describe('anthropic-version header', () => {
    // `anthropic-version` is a dated API version, not a feature flag. Anthropic
    // publishes `2023-06-01`; anything else is rejected with a 400 before the
    // request is routed, which took out /v1/models and every chat call with it.
    // Opt-in features belong on `anthropic-beta`, so nothing may "bump" this.
    it('pins the version to the value Anthropic actually accepts', () => {
      expect(ANTHROPIC_VERSION).toBe('2023-06-01');
    });

    it('sends the version and the api key on healthCheck', async () => {
      mockFetchOk(mockModelsResponse);

      await adapter.healthCheck(mockConfig);

      expect(lastRequestHeaders()).toEqual({
        'x-api-key': 'sk-ant-test-key',
        'anthropic-version': '2023-06-01',
      });
    });

    it('sends the version and the api key on syncModels', async () => {
      mockFetchOk(mockModelsResponse);

      await adapter.syncModels(mockConfig);

      expect(lastRequestHeaders()).toEqual({
        'x-api-key': 'sk-ant-test-key',
        'anthropic-version': '2023-06-01',
      });
    });
  });

  // --- healthCheck ---

  describe('healthCheck', () => {
    it('returns HEALTHY when the API responds ok', async () => {
      mockFetchOk(mockModelsResponse);

      const result = await adapter.healthCheck(mockConfig);

      expect(result.status).toBe(ConnectorStatus.HEALTHY);
      expect(global.fetch).toHaveBeenCalledWith(
        `${ANTHROPIC_DEFAULT_BASE_URL}/models`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('returns DOWN with the status in the message when the API rejects the request', async () => {
      mockFetchError(400);

      const result = await adapter.healthCheck(mockConfig);

      expect(result.status).toBe(ConnectorStatus.DOWN);
      expect(result.errorMessage).toContain('400');
    });
  });

  // --- syncModels ---

  describe('syncModels', () => {
    it('normalizes the provider listing', async () => {
      mockFetchOk(mockModelsResponse);

      const models = await adapter.syncModels(mockConfig);

      expect(models).toHaveLength(2);
      expect(models[0]).toEqual({
        modelKey: 'claude-opus-4-1',
        displayName: 'Claude Opus 4.1',
        lifecycle: ModelLifecycle.ACTIVE,
        capabilities: {
          supportsStreaming: true,
          supportsTools: true,
          supportsVision: true,
          supportsAudio: false,
          supportsStructuredOutput: true,
        },
      });
    });

    it('falls back to a formatted id when the provider sends no display name', async () => {
      mockFetchOk(mockModelsResponse);

      const models = await adapter.syncModels(mockConfig);

      expect(models[1]?.displayName).toBe('Claude Sonnet 4 0');
    });

    it('honours a configured base url', async () => {
      mockFetchOk(mockModelsResponse);

      await adapter.syncModels({ ...mockConfig, baseUrl: 'https://proxy.internal/v1' });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://proxy.internal/v1/models',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('throws with the status when the provider rejects the request', async () => {
      mockFetchError(400);

      await expect(adapter.syncModels(mockConfig)).rejects.toThrow(
        'Failed to fetch Anthropic models: HTTP 400',
      );
    });

    it('tolerates a listing with no data array', async () => {
      mockFetchOk({ has_more: false, first_id: null, last_id: null });

      await expect(adapter.syncModels(mockConfig)).resolves.toEqual([]);
    });
  });
});
