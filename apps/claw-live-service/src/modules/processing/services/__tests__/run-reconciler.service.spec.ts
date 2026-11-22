vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ LIVE_WORKER_MAX_CONCURRENCY: 2 }) },
}));

import { RunReconcilerService } from '../run-reconciler.service';

describe('RunReconcilerService', () => {
  const runs = { claimNext: vi.fn(), releaseLeases: vi.fn().mockResolvedValue(undefined) };
  const factory = { create: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    runs.releaseLeases.mockResolvedValue(undefined);
  });

  function worker(): { run: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> } {
    return { run: vi.fn(() => new Promise<void>(() => {})), stop: vi.fn() };
  }

  it('claims runs up to LIVE_WORKER_MAX_CONCURRENCY and starts a worker for each', async () => {
    const reconciler = new RunReconcilerService(runs as never, factory as never);
    runs.claimNext
      .mockResolvedValueOnce({ id: 'a', generation: 1 })
      .mockResolvedValueOnce({ id: 'b', generation: 3 })
      .mockResolvedValueOnce({ id: 'c', generation: 1 });
    factory.create.mockImplementation(async () => worker());
    await reconciler.tick();
    expect(runs.claimNext).toHaveBeenCalledTimes(2);
    expect(factory.create).toHaveBeenCalledWith({ id: 'b', generation: 3 });
    expect(reconciler.activeWorkers).toBe(2);
    await reconciler.tick();
    expect(runs.claimNext).toHaveBeenCalledTimes(2);
  });

  it('stops when nothing is claimable, skips vanished runs, frees slots when workers end', async () => {
    const reconciler = new RunReconcilerService(runs as never, factory as never);
    let finish: () => void = () => {};
    runs.claimNext
      .mockResolvedValueOnce({ id: 'gone', generation: 1 })
      .mockResolvedValueOnce({ id: 'a', generation: 1 })
      .mockResolvedValueOnce(null);
    factory.create.mockResolvedValueOnce(null).mockResolvedValueOnce({
      run: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
      stop: vi.fn(),
    });
    await reconciler.tick();
    expect(reconciler.activeWorkers).toBe(1);
    finish();
    await new Promise((resolve) => setImmediate(resolve));
    expect(reconciler.activeWorkers).toBe(0);
  });

  it('skips an overlapping pass and survives a failing claim', async () => {
    const reconciler = new RunReconcilerService(runs as never, factory as never);
    let release: (value: null) => void = () => {};
    runs.claimNext.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const first = reconciler.tick();
    await reconciler.tick();
    expect(runs.claimNext).toHaveBeenCalledTimes(1);
    release(null);
    await first;
    runs.claimNext.mockRejectedValueOnce(new Error('db'));
    await expect(reconciler.tick()).resolves.toBeUndefined();
  });

  it('stops workers and releases leases on shutdown', async () => {
    const reconciler = new RunReconcilerService(runs as never, factory as never);
    const w = worker();
    runs.claimNext.mockResolvedValueOnce({ id: 'a', generation: 1 }).mockResolvedValueOnce(null);
    factory.create.mockResolvedValueOnce(w);
    reconciler.onModuleInit();
    await reconciler.tick();
    await reconciler.onModuleDestroy();
    expect(w.stop).toHaveBeenCalled();
    expect(runs.releaseLeases).toHaveBeenCalledWith(expect.stringMatching(/:\d+:/u));
  });
});
