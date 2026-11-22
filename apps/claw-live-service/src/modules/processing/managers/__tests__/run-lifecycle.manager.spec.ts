import { EventPattern } from '@claw/shared-types';

import { LiveRunEndReason } from '../../../../common/enums/live-run-end-reason.enum';
import { LiveStatusCode } from '../../../../common/enums/live-status-code.enum';
import { LiveMode, LiveRunStatus, LiveSourceKind } from '../../../../generated/prisma';
import { RunLifecycleManager } from '../run-lifecycle.manager';

const context = {
  lease: { runId: 'run-1', generation: 4 },
  streamId: 'st1',
  mode: LiveMode.AUDIO,
  sourceKind: LiveSourceKind.FIXTURE,
  sourceUrl: 'fixture:live-demo',
  declaredHost: null,
  startedAt: new Date('2026-11-22T10:00:00Z'),
};

describe('RunLifecycleManager', () => {
  const tx = { liveProcessingRun: { update: vi.fn(), updateMany: vi.fn() } };
  const prisma = {
    liveProviderCost: { aggregate: vi.fn().mockResolvedValue({ _sum: { costMicroUsd: 1234n } }) },
    liveViewerSession: { findMany: vi.fn().mockResolvedValue([{ userId: 'a' }, { userId: 'b' }]) },
  };
  const writer = {
    commit: vi.fn((_lease: unknown, fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const events = { emit: vi.fn() };
  const rabbit = { publish: vi.fn() };
  const manager = new RunLifecycleManager(
    prisma as never,
    writer as never,
    events as never,
    rabbit as never,
  );

  beforeEach(() => vi.clearAllMocks());

  it('activates only a PENDING run', async () => {
    await manager.activate(context);
    expect(tx.liveProcessingRun.updateMany).toHaveBeenCalledWith({
      where: { id: 'run-1', status: LiveRunStatus.PENDING },
      data: { status: LiveRunStatus.ACTIVE },
    });
  });

  it('sets DELAYED and publishes the status event', async () => {
    await manager.setStatus(context, LiveRunStatus.DELAYED, LiveStatusCode.DELAYED);
    expect(tx.liveProcessingRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: LiveRunStatus.DELAYED },
    });
    expect(events.emit.mock.calls[0]?.[0][0]).toMatchObject({ type: 'status', status: 'DELAYED' });
  });

  it('stops a run: clears activeKey + lease, announces live.run_ended with totals only', async () => {
    await manager.finish(context, LiveRunStatus.STOPPED, LiveRunEndReason.NO_VIEWERS, 125_400);
    expect(tx.liveProcessingRun.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'STOPPED',
      activeKey: null,
      leaseOwner: null,
      failureCode: null,
    });
    expect(events.emit).not.toHaveBeenCalled();
    const [pattern, payload] = rabbit.publish.mock.calls[0] ?? [];
    expect(pattern).toBe(EventPattern.LIVE_RUN_ENDED);
    expect(payload).toMatchObject({
      runId: 'run-1',
      sourceId: 'st1',
      reason: 'NO_VIEWERS',
      analysedSeconds: 125,
      providerCostMicroUsd: 1234,
      viewerCount: 2,
      startedAt: '2026-11-22T10:00:00.000Z',
    });
    expect(Object.keys(payload)).not.toContain('sourceUrl');
  });

  it('ENDED publishes the ENDED status; FAILED stores the reason; a broker outage is swallowed', async () => {
    rabbit.publish.mockRejectedValueOnce(new Error('broker down'));
    await expect(
      manager.finish(context, LiveRunStatus.ENDED, LiveRunEndReason.SOURCE_ENDED, 0),
    ).resolves.toBeUndefined();
    expect(events.emit.mock.calls[0]?.[0][0].status).toBe('ENDED');
    await manager.finish(context, LiveRunStatus.FAILED, LiveRunEndReason.FAILED, 0);
    expect(tx.liveProcessingRun.update.mock.calls[1]?.[0].data.failureCode).toBe('FAILED');
  });
});
