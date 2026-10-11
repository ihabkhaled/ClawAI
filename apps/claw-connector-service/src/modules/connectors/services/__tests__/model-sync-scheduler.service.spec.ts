import { type Connector } from '../../../../generated/prisma';
import { type ConnectorsRepository } from '../../repositories/connectors.repository';
import { ModelSyncSchedulerService } from '../model-sync-scheduler.service';
import { type ConnectorsService } from '../connectors.service';

function connector(id: string, encryptedConfig: string | null): Connector {
  return { id, encryptedConfig } as Connector;
}

function build(rows: Connector[], syncModels: ReturnType<typeof vi.fn>) {
  const repo = { findEnabled: vi.fn().mockResolvedValue(rows) };
  const service = new ModelSyncSchedulerService(
    repo as unknown as ConnectorsRepository,
    { syncModels } as unknown as ConnectorsService,
  );
  return { service, repo };
}

describe('ModelSyncSchedulerService', () => {
  it('syncs only connectors that hold a key', async () => {
    const syncModels = vi.fn().mockResolvedValue({});
    const { service } = build(
      [connector('a', 'enc'), connector('b', null), connector('c', 'enc')],
      syncModels,
    );
    const summary = await service.runOnce();
    expect(syncModels.mock.calls).toEqual([['a'], ['c']]);
    expect(summary).toEqual({ attempted: 2, succeeded: 2, failed: 0, skipped: false });
  });

  it('isolates a failing connector from the rest', async () => {
    const syncModels = vi
      .fn()
      .mockRejectedValueOnce(new Error('sk-secret-token leaked'))
      .mockResolvedValueOnce({});
    const { service } = build([connector('a', 'enc'), connector('b', 'enc')], syncModels);
    const summary = await service.runOnce();
    expect(summary).toEqual({ attempted: 2, succeeded: 1, failed: 1, skipped: false });
  });

  it('skips a tick while a run is still going', async () => {
    let release: () => void = () => {
      throw new Error('not started');
    };
    const syncModels = vi
      .fn()
      .mockResolvedValue({})
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      );
    const { service } = build([connector('a', 'enc')], syncModels);
    const first = service.runOnce();
    await vi.waitFor(() => {
      expect(syncModels).toHaveBeenCalled();
    });
    const second = await service.runOnce();
    expect(second.skipped).toBe(true);
    release();
    await first;
    expect((await service.runOnce()).skipped).toBe(false);
  });

  it('survives the connector listing failing', async () => {
    const { service, repo } = build([], vi.fn());
    repo.findEnabled.mockRejectedValueOnce(new Error('db down'));
    await expect(service.runOnce()).resolves.toMatchObject({ attempted: 0, skipped: false });
  });

  it('stops its timer on destroy', () => {
    vi.useFakeTimers();
    const syncModels = vi.fn().mockResolvedValue({});
    const { service } = build([connector('a', 'enc')], syncModels);
    service.onModuleInit();
    service.onModuleDestroy();
    vi.advanceTimersByTime(24 * 60 * 60_000);
    vi.useRealTimers();
    expect(syncModels).not.toHaveBeenCalled();
  });
});
