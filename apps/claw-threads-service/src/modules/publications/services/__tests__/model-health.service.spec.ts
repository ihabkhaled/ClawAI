import { ModelHealthService } from '../model-health.service';

describe('ModelHealthService', () => {
  afterEach(() => vi.useRealTimers());

  it('indexes counts by provider/model and reads once per minute', async () => {
    vi.useFakeTimers();
    const generation = {
      getModelHealth: vi
        .fn()
        .mockResolvedValue([{ provider: 'gemini', model: 'models/g', ok: 1, failed: 4 }]),
    };
    const service = new ModelHealthService(generation as never);

    const index = await service.current();
    await service.current();

    expect(index.get('GEMINI/g')).toEqual({ ok: 1, failed: 4 });
    expect(generation.getModelHealth).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_001);
    await service.current();
    expect(generation.getModelHealth).toHaveBeenCalledTimes(2);
  });

  it('answers with no health instead of failing when the generation service is down', async () => {
    const generation = { getModelHealth: vi.fn().mockRejectedValue(new Error('down')) };
    const service = new ModelHealthService(generation as never);

    const index = await service.current();

    expect(index.size).toBe(0);
  });
});
