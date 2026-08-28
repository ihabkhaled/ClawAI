import { ConnectorStatus, ModelLifecycle } from '../../../generated/prisma';
import { GrokAdapter } from '../managers/adapters/grok.adapter';
import { GROK_DEFAULT_BASE_URL } from '../constants/grok.constants';

jest.mock('../../../app/config/app.config', () => ({
  AppConfig: {
    get: jest.fn().mockReturnValue({ ENCRYPTION_KEY: 'a'.repeat(64) }),
  },
}));

const mockConfig = {
  provider: 'GROK',
  apiKey: 'xai-test-key',
  baseUrl: undefined,
  region: undefined,
};

const mockModelsResponse = {
  object: 'list',
  data: [
    { id: 'grok-3', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'grok-3-mini', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'grok-3-fast', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'grok-2-vision-1212', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'grok-image-beta', object: 'model', created: 1700000000, owned_by: 'xai' },
    { id: 'unrelated-model', object: 'model', created: 1700000000, owned_by: 'xai' },
  ],
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
    text: () => Promise.resolve(JSON.stringify({})),
  });
}

function mockFetchThrow(message: string): void {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

describe('GrokAdapter', () => {
  let adapter: GrokAdapter;

  beforeEach(() => {
    adapter = new GrokAdapter();
  });

  // --- healthCheck ---

  describe('healthCheck', () => {
    it('returns HEALTHY when API responds ok', async () => {
      mockFetchOk(mockModelsResponse);

      const result = await adapter.healthCheck(mockConfig);

      expect(result.status).toBe(ConnectorStatus.HEALTHY);
      expect(typeof result.latencyMs).toBe('number');
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.errorMessage).toBeUndefined();
    });

    it('uses GROK_DEFAULT_BASE_URL when config has no baseUrl', async () => {
      mockFetchOk(mockModelsResponse);

      await adapter.healthCheck(mockConfig);

      expect(global.fetch).toHaveBeenCalledWith(
        `${GROK_DEFAULT_BASE_URL}/models`,
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer xai-test-key' }),
        }),
      );
    });

    it('uses custom baseUrl when provided', async () => {
      mockFetchOk(mockModelsResponse);
      const customBase = 'https://custom-grok.example.com/v1';

      await adapter.healthCheck({ ...mockConfig, baseUrl: customBase });

      expect(global.fetch).toHaveBeenCalledWith(`${customBase}/models`, expect.any(Object));
    });

    it('returns DOWN with errorMessage when API returns non-ok status', async () => {
      mockFetchError(401);

      const result = await adapter.healthCheck(mockConfig);

      expect(result.status).toBe(ConnectorStatus.DOWN);
      expect(result.errorMessage).toContain('401');
    });

    it('returns DOWN with errorMessage when network throws', async () => {
      mockFetchThrow('Connection refused');

      const result = await adapter.healthCheck(mockConfig);

      expect(result.status).toBe(ConnectorStatus.DOWN);
      expect(result.errorMessage).toBe('Connection refused');
    });

    it('returns DOWN with generic errorMessage for non-Error throws', async () => {
      global.fetch = jest.fn().mockRejectedValue('string-error');

      const result = await adapter.healthCheck(mockConfig);

      expect(result.status).toBe(ConnectorStatus.DOWN);
      expect(result.errorMessage).toBe('Unknown error connecting to Grok');
    });
  });

  // --- syncModels ---

  describe('syncModels', () => {
    it('filters only grok- prefixed models', async () => {
      mockFetchOk(mockModelsResponse);

      const result = await adapter.syncModels(mockConfig);

      // 5 grok-* models, 1 unrelated filtered out
      expect(result).toHaveLength(5);
      expect(result.every((m) => m.modelKey.startsWith('grok-'))).toBe(true);
    });

    it('maps model keys and display names correctly', async () => {
      mockFetchOk(mockModelsResponse);

      const result = await adapter.syncModels(mockConfig);
      const grok3 = result.find((m) => m.modelKey === 'grok-3');

      expect(grok3).toBeDefined();
      expect(grok3?.displayName).toBe('Grok 3');
      expect(grok3?.lifecycle).toBe(ModelLifecycle.ACTIVE);
    });

    it('marks vision models as supportsVision=true', async () => {
      mockFetchOk(mockModelsResponse);

      const result = await adapter.syncModels(mockConfig);
      const visionModel = result.find((m) => m.modelKey === 'grok-2-vision-1212');

      expect(visionModel?.capabilities.supportsVision).toBe(true);
    });

    it('marks non-vision models as supportsVision=false', async () => {
      mockFetchOk(mockModelsResponse);

      const result = await adapter.syncModels(mockConfig);
      const grok3 = result.find((m) => m.modelKey === 'grok-3');

      expect(grok3?.capabilities.supportsVision).toBe(false);
    });

    it('sets supportsStreaming=true and supportsTools=true for all models', async () => {
      mockFetchOk(mockModelsResponse);

      const result = await adapter.syncModels(mockConfig);

      expect(result.every((m) => m.capabilities.supportsStreaming)).toBe(true);
      expect(result.every((m) => m.capabilities.supportsTools)).toBe(true);
      expect(result.every((m) => !m.capabilities.supportsAudio)).toBe(true);
    });

    it('returns empty array when no grok- models found', async () => {
      mockFetchOk({
        object: 'list',
        data: [{ id: 'unrelated', object: 'model', created: 0, owned_by: 'xai' }],
      });

      const result = await adapter.syncModels(mockConfig);

      expect(result).toHaveLength(0);
    });

    it('throws when API returns non-ok status', async () => {
      mockFetchError(403);

      await expect(adapter.syncModels(mockConfig)).rejects.toThrow(
        'Failed to fetch Grok models: HTTP 403',
      );
    });

    it('handles empty data array gracefully', async () => {
      mockFetchOk({ object: 'list', data: [] });

      const result = await adapter.syncModels(mockConfig);

      expect(result).toHaveLength(0);
    });
  });

  // --- getCapabilities ---

  describe('getCapabilities', () => {
    it('returns correct capability flags', () => {
      const caps = adapter.getCapabilities();

      expect(caps.supportsStreaming).toBe(true);
      expect(caps.supportsTools).toBe(true);
      expect(caps.supportsVision).toBe(true);
    });
  });
});
