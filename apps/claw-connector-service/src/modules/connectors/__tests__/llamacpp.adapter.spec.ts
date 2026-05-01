import { LlamacppAdapter } from '../managers/adapters/llamacpp.adapter';
import { ConnectorStatus, ModelLifecycle } from '../../../generated/prisma';
import { httpGet } from '../../../common/utilities/http.utility';

jest.mock('../../../common/utilities/http.utility', () => ({
  httpGet: jest.fn(),
}));

const mockedHttpGet = httpGet as unknown as jest.Mock;

describe('LlamacppAdapter', () => {
  let adapter: LlamacppAdapter;

  beforeEach(() => {
    adapter = new LlamacppAdapter();
    mockedHttpGet.mockReset();
  });

  describe('healthCheck', () => {
    it('returns HEALTHY when binary installed', async () => {
      mockedHttpGet.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { binary: { installed: true }, activeModel: null },
      });
      const result = await adapter.healthCheck({ provider: 'LLAMACPP', apiKey: '' });
      expect(result.status).toBe(ConnectorStatus.HEALTHY);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('returns DEGRADED when binary missing', async () => {
      mockedHttpGet.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { binary: { installed: false }, activeModel: null },
      });
      const result = await adapter.healthCheck({ provider: 'LLAMACPP', apiKey: '' });
      expect(result.status).toBe(ConnectorStatus.DEGRADED);
      expect(result.errorMessage).toContain('binary not yet installed');
    });

    it('returns DOWN on non-200', async () => {
      mockedHttpGet.mockResolvedValueOnce({ ok: false, status: 503, data: {} });
      const result = await adapter.healthCheck({ provider: 'LLAMACPP', apiKey: '' });
      expect(result.status).toBe(ConnectorStatus.DOWN);
    });

    it('returns DOWN on network failure', async () => {
      mockedHttpGet.mockRejectedValueOnce(new Error('econn'));
      const result = await adapter.healthCheck({ provider: 'LLAMACPP', apiKey: '' });
      expect(result.status).toBe(ConnectorStatus.DOWN);
      expect(result.errorMessage).toBe('econn');
    });
  });

  describe('syncModels', () => {
    it('maps READY catalog rows to NormalizedModels', async () => {
      mockedHttpGet.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          rows: [
            {
              id: 'a',
              name: 'glm-5.1',
              tag: 'Q4_K_M',
              displayName: 'GLM-5.1',
              category: 'THINKING',
              contextLength: 200_000,
              capabilities: ['vision', 'tool_use'],
              downloadStatus: 'READY',
              loadStatus: 'UNLOADED',
            },
          ],
          total: 1,
        },
      });

      const models = await adapter.syncModels({ provider: 'LLAMACPP', apiKey: '' });
      expect(models).toHaveLength(1);
      expect(models[0]).toEqual(
        expect.objectContaining({
          modelKey: 'glm-5.1:Q4_K_M',
          displayName: 'GLM-5.1',
          lifecycle: ModelLifecycle.ACTIVE,
        }),
      );
      expect(models[0]?.capabilities.supportsVision).toBe(true);
      expect(models[0]?.capabilities.supportsTools).toBe(true);
      expect(models[0]?.capabilities.maxContextTokens).toBe(200_000);
    });

    it('returns empty array when API returns non-OK', async () => {
      mockedHttpGet.mockResolvedValueOnce({ ok: false, status: 500, data: { rows: [] } });
      const models = await adapter.syncModels({ provider: 'LLAMACPP', apiKey: '' });
      expect(models).toEqual([]);
    });

    it('returns empty array on thrown error (no crash)', async () => {
      mockedHttpGet.mockRejectedValueOnce(new Error('boom'));
      const models = await adapter.syncModels({ provider: 'LLAMACPP', apiKey: '' });
      expect(models).toEqual([]);
    });
  });

  describe('getCapabilities', () => {
    it('declares streaming, no tools, no vision (per-model overrides come from catalog)', () => {
      expect(adapter.getCapabilities()).toEqual({
        supportsStreaming: true,
        supportsTools: false,
        supportsVision: false,
      });
    });
  });
});
