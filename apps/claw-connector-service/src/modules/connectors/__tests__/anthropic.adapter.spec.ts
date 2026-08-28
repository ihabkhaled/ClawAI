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
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function mockFetchError(status: number): void {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve('{}'),
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

  // --- workspace scoping ---

  describe('anthropic-workspace-id header', () => {
    // An identity-linked key carries no workspace of its own; Anthropic rejects
    // every call with a 400 until the request names one.
    it('sends the workspace id when the connector configures one', async () => {
      mockFetchOk(mockModelsResponse);

      await adapter.syncModels({ ...mockConfig, workspaceId: 'wrkspc_123' });

      expect(lastRequestHeaders()['anthropic-workspace-id']).toBe('wrkspc_123');
    });

    // A workspace-scoped key needs no header, and a blank one is itself a 400 —
    // so an unset or whitespace-only value must omit the header, not send "".
    it.each([
      ['unset', undefined],
      ['empty', ''],
      ['whitespace only', '   '],
    ])('omits the header when the workspace id is %s', async (_label, workspaceId) => {
      mockFetchOk(mockModelsResponse);

      await adapter.syncModels({ ...mockConfig, workspaceId });

      expect(lastRequestHeaders()).not.toHaveProperty('anthropic-workspace-id');
    });

    it('trims a padded workspace id rather than sending it verbatim', async () => {
      mockFetchOk(mockModelsResponse);

      await adapter.healthCheck({ ...mockConfig, workspaceId: '  wrkspc_123  ' });

      expect(lastRequestHeaders()['anthropic-workspace-id']).toBe('wrkspc_123');
    });
  });

  // --- error reporting ---

  describe('provider error reporting', () => {
    const workspaceError = {
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message:
          'anthropic-workspace-id is required when authenticating with an identity-linked API key; send the id of the workspace this request acts in.',
      },
    };

    function mockFetchErrorBody(status: number, body: unknown): void {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status,
        text: () => Promise.resolve(JSON.stringify(body)),
      });
    }

    // A bare "status 400" cannot tell an operator whether the key, the URL or
    // the workspace is at fault. The provider says which; repeat it.
    it('carries the provider explanation into the health check result', async () => {
      mockFetchErrorBody(400, workspaceError);

      const result = await adapter.healthCheck(mockConfig);

      expect(result.status).toBe(ConnectorStatus.DOWN);
      expect(result.errorMessage).toContain('anthropic-workspace-id is required');
    });

    it('carries the provider explanation into the sync failure', async () => {
      mockFetchErrorBody(400, workspaceError);

      await expect(adapter.syncModels(mockConfig)).rejects.toThrow(
        /anthropic-workspace-id is required/,
      );
    });

    it('falls back to the bare status when the body explains nothing', async () => {
      mockFetchErrorBody(500, {});

      const result = await adapter.healthCheck(mockConfig);

      expect(result.errorMessage).toBe('Anthropic API returned status 500');
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
        'Failed to fetch Anthropic models: Anthropic API returned status 400',
      );
    });

    it('tolerates a listing with no data array', async () => {
      mockFetchOk({ has_more: false, first_id: null, last_id: null });

      await expect(adapter.syncModels(mockConfig)).resolves.toEqual([]);
    });
  });
});
