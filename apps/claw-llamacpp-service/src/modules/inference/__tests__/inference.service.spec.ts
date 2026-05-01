import { BusinessException } from '../../../common/errors';
import { InferenceService } from '../services/inference.service';

describe('InferenceService', () => {
  it('throws NO_MODEL_LOADED when no model resident', () => {
    const lifecycle = { getResidentPort: () => null };
    const svc = new InferenceService(lifecycle as any);
    expect(() => svc.assertReady()).toThrow(BusinessException);
  });

  it('returns port when model resident', () => {
    const lifecycle = { getResidentPort: () => 48500 };
    const svc = new InferenceService(lifecycle as any);
    const result = svc.assertReady();
    expect(result.port).toBe(48500);
  });
});
