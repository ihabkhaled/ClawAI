import { LiveRunStatus } from '../../../../generated/prisma';
import { LeaseLostError } from '../../errors/processing.errors';
import { FencedRunWriter } from '../fenced-run-writer.service';

describe('FencedRunWriter', () => {
  const tx = {
    liveProcessingRun: { updateMany: vi.fn(), findUnique: vi.fn() },
    liveRunTombstone: { findUnique: vi.fn() },
  };
  const prisma = { $transaction: vi.fn((fn: (client: typeof tx) => Promise<unknown>) => fn(tx)) };
  const writer = new FencedRunWriter(prisma as never);
  const lease = { runId: 'run-1', generation: 7 };

  beforeEach(() => {
    vi.clearAllMocks();
    tx.liveProcessingRun.updateMany.mockResolvedValue({ count: 1 });
    tx.liveRunTombstone.findUnique.mockResolvedValue(null);
  });

  it('renews the lease fenced on id + generation + live status, then writes', async () => {
    const write = vi.fn().mockResolvedValue('done');
    await expect(writer.commit(lease, write)).resolves.toBe('done');
    const call = tx.liveProcessingRun.updateMany.mock.calls[0]?.[0];
    expect(call.where).toEqual({
      id: 'run-1',
      generation: 7,
      status: {
        in: [
          LiveRunStatus.PENDING,
          LiveRunStatus.ACTIVE,
          LiveRunStatus.DELAYED,
          LiveRunStatus.STOPPING,
        ],
      },
    });
    expect(call.data.leaseExpiresAt.getTime()).toBeGreaterThan(Date.now() + 14_000);
    expect(write).toHaveBeenCalledWith(tx);
  });

  it('throws LeaseLostError and writes nothing when 0 rows match (stale generation / stopped)', async () => {
    tx.liveProcessingRun.updateMany.mockResolvedValueOnce({ count: 0 });
    const write = vi.fn();
    await expect(writer.commit(lease, write)).rejects.toBeInstanceOf(LeaseLostError);
    expect(write).not.toHaveBeenCalled();
  });

  it('throws LeaseLostError when the run is tombstoned', async () => {
    tx.liveRunTombstone.findUnique.mockResolvedValueOnce({ runId: 'run-1' });
    const write = vi.fn();
    await expect(writer.commit(lease, write)).rejects.toBeInstanceOf(LeaseLostError);
    expect(write).not.toHaveBeenCalled();
  });

  it('renew() returns the current status', async () => {
    tx.liveProcessingRun.findUnique.mockResolvedValueOnce({ status: LiveRunStatus.STOPPING });
    await expect(writer.renew(lease)).resolves.toBe(LiveRunStatus.STOPPING);
    tx.liveProcessingRun.findUnique.mockResolvedValueOnce(null);
    await expect(writer.renew(lease)).rejects.toBeInstanceOf(LeaseLostError);
  });
});
