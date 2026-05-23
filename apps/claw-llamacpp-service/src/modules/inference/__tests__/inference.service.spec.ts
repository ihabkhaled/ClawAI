import { BusinessException } from '../../../common/errors';
import { InferenceService } from '../services/inference.service';

describe('InferenceService', () => {
  describe('assertReady (sync)', () => {
    it('throws NO_MODEL_LOADED when no model resident', () => {
      const lifecycle = { getResidentPort: () => null };
      const svc = new InferenceService(lifecycle as any, {} as any);
      expect(() => svc.assertReady()).toThrow(BusinessException);
    });

    it('returns port when model resident', () => {
      const lifecycle = { getResidentPort: () => 48500 };
      const svc = new InferenceService(lifecycle as any, {} as any);
      const result = svc.assertReady();
      expect(result.port).toBe(48500);
    });
  });

  describe('ensureReady (auto-load)', () => {
    it('returns loaded port when requested model matches name:tag', async () => {
      const lifecycle = {
        getLoaded: async () => ({ id: 'id-1', name: 'phi-4-mini', tag: 'Q4_K_M', port: 48500 }),
      };
      const svc = new InferenceService(lifecycle as any, {} as any);
      expect((await svc.ensureReady('phi-4-mini:Q4_K_M')).port).toBe(48500);
    });

    it('swaps to requested model when different model is loaded', async () => {
      const lifecycle = {
        getLoaded: async () => ({ id: 'id-1', name: 'qwen3-coder', tag: 'Q4_K_M', port: 48500 }),
        load: jest.fn().mockResolvedValue({ id: 'id-2', port: 48800 }),
      };
      const catalogRepo = {
        findByName: jest.fn().mockResolvedValue({ id: 'id-2', name: 'phi-4-mini', tag: 'Q4_K_M' }),
        findById: jest.fn(),
      };
      const svc = new InferenceService(lifecycle as any, catalogRepo as any);
      const result = await svc.ensureReady('phi-4-mini:Q4_K_M');
      expect(result.port).toBe(48800);
      expect(lifecycle.load).toHaveBeenCalledWith('id-2');
    });

    it('auto-loads requested model when nothing is loaded', async () => {
      const lifecycle = {
        getLoaded: async () => null,
        load: jest.fn().mockResolvedValue({ id: 'id-2', port: 48800 }),
      };
      const catalogRepo = {
        findByName: jest.fn().mockResolvedValue({ id: 'id-2', name: 'phi-4-mini', tag: 'Q4_K_M' }),
        findById: jest.fn(),
      };
      const svc = new InferenceService(lifecycle as any, catalogRepo as any);
      const result = await svc.ensureReady('phi-4-mini:Q4_K_M');
      expect(result.port).toBe(48800);
    });

    it('throws NO_MODEL_LOADED when nothing loaded and no model requested', async () => {
      const lifecycle = { getLoaded: async () => null };
      const svc = new InferenceService(lifecycle as any, {} as any);
      await expect(svc.ensureReady()).rejects.toThrow(BusinessException);
    });

    it('throws MODEL_NOT_FOUND when requested model not in catalog', async () => {
      const lifecycle = { getLoaded: async () => null };
      const catalogRepo = {
        findByName: jest.fn().mockResolvedValue(null),
        findById: jest.fn().mockResolvedValue(null),
      };
      const svc = new InferenceService(lifecycle as any, catalogRepo as any);
      await expect(svc.ensureReady('unknown:abc')).rejects.toThrow(BusinessException);
    });
  });
});
